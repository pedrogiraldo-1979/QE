import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { readCompleteMetricSource, fetchOperationalMetrics } from "../src/lib/data/operationalMetricsRepository.ts";

const signal = () => new AbortController().signal;
const rows = (count) => Array.from({ length: count }, (_, id) => ({ id: String(id) }));
const response = (data, count, error = null) => ({ data, count, error, status: error ? 500 : 200, statusText: "" });

test("paginación recorre 1001 filas sin saltos y offsets inclusivos", async () => {
  const data = rows(1001);
  const offsets = [];
  const result = await readCompleteMetricSource(async (from, to) => {
    offsets.push([from, to]);
    return response(data.slice(from, to + 1), data.length);
  }, signal());
  assert.deepEqual(offsets, [[0, 499], [500, 999], [1000, 1499]]);
  assert.deepEqual(result, { status: "complete", rows: data });
});

test("paginación diferencia base vacía de respuesta nula", async () => {
  assert.deepEqual(await readCompleteMetricSource(async () => response([], 0), signal()), { status: "complete", rows: [] });
  assert.deepEqual(await readCompleteMetricSource(async () => response(null, 0), signal()), { status: "error" });
});

for (const count of [null, -1, 0.5, Number.NaN]) {
  test(`paginación rechaza conteo no verificable ${String(count)}`, async () => {
    assert.deepEqual(await readCompleteMetricSource(async () => response([], count), signal()), { status: "incomplete" });
  });
}

test("paginación no devuelve filas parciales tras error remoto o excepción", async () => {
  for (const throws of [false, true]) {
    const result = await readCompleteMetricSource(async (from) => {
      if (!from) return response(rows(500), 501);
      if (throws) throw new Error("private diagnostic must not escape");
      return response(null, null, { message: "private diagnostic must not escape" });
    }, signal());
    assert.deepEqual(result, { status: "error" });
  }
});

test("paginación rechaza población cambiante", async () => {
  assert.deepEqual(await readCompleteMetricSource(async (from) => response(from ? [{ id: "last" }] : rows(500), from ? 502 : 501), signal()),
    { status: "incomplete" });
});

test("paginación detecta truncamiento silencioso y exceso de filas", async () => {
  for (const count of [501, 1]) {
    assert.deepEqual(await readCompleteMetricSource(async () => response(rows(2), count), signal()), { status: "incomplete" });
  }
});

test("paginación detecta IDs repetidos o vacíos", async () => {
  for (const data of [[{ id: "duplicate" }, { id: "duplicate" }], [{ id: "" }]]) {
    assert.deepEqual(await readCompleteMetricSource(async () => response(data, data.length), signal()), { status: "incomplete" });
  }
});

test("paginación rechaza poblaciones que exceden el presupuesto local", async () => {
  let calls = 0;
  assert.deepEqual(await readCompleteMetricSource(async () => { calls++; return response(rows(500), 10001); }, signal()),
    { status: "incomplete" });
  assert.equal(calls, 1);
});

test("paginación no inicia ni publica una lectura abortada", async () => {
  const controller = new AbortController();
  controller.abort();
  assert.deepEqual(await readCompleteMetricSource(async () => { throw new Error("must not execute"); }, controller.signal), { status: "error" });
  const pendingController = new AbortController();
  assert.deepEqual(await readCompleteMetricSource(async () => {
    pendingController.abort(); return response([], 0);
  }, pendingController.signal), { status: "error" });
});

function clientFor(tableData, errors = {}) {
  const calls = [];
  return { calls, from(table) {
    const query = {
      select(columns, options) { calls.push({ table, columns, options }); return query; },
      order(column, options) { assert.equal(column, "id"); assert.equal(options.ascending, true); return query; },
      range(from, to) { query.from = from; query.to = to; return query; },
      retry(enabled) { assert.equal(enabled, false); return query; },
      abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal);
        const data = tableData[table] ?? [];
        return Promise.resolve(response(data.slice(query.from, query.to + 1), data.length, errors[table] ?? null));
      },
    };
    return query;
  } };
}

test("repositorio calcula ambos agregados usando sólo columnas mínimas y count exacto", async () => {
  const client = clientFor({
    companies: [{ id: "company" }],
    contacts: [{ id: "contact", company_id: "company", full_name: "Sintético", email: "test@example.invalid", phone: null }],
    activities: [{ id: "activity", activity_type: "call", due_date: "2000-01-01", completed: false }],
    prospect_activities: [{ id: "prospect-activity", activity_type: "note", due_date: "2000-01-01", completed: false }],
  });
  const result = await fetchOperationalMetrics(client, signal());
  assert.deepEqual(result.coverage, { status: "available", numerator: 1, denominator: 1, percentage: 100 });
  assert.deepEqual(result.overdue, { status: "available", count: 1 });
  assert.equal(client.calls.length, 4);
  for (const call of client.calls) {
    assert.deepEqual(call.options, { count: "exact" });
    assert.doesNotMatch(call.columns, /notes|created_at|\*/);
  }
});

test("repositorio conserva independencia de métricas ante un fallo de prospección", async () => {
  const result = await fetchOperationalMetrics(clientFor({}, { prospect_activities: { message: "private" } }), signal());
  assert.equal(result.coverage.status, "available");
  assert.deepEqual(result.overdue, { status: "unavailable", reason: "source-error" });
});

test("repositorio no interpreta tipos desconocidos o finalización nula como acciones válidas", async () => {
  for (const activity of [
    { activity_type: "unknown", completed: false }, { activity_type: "call", completed: null },
  ]) {
    const result = await fetchOperationalMetrics(clientFor({ activities: [{ id: "activity", due_date: "2000-01-01", ...activity }] }), signal());
    assert.equal(result.overdue.status, "unavailable");
  }
});

test("cliente Supabase real transmite sólo GET, columnas mínimas, rango y conteo exacto", async () => {
  const requests = [];
  const client = createClient("https://qe-metric-test.invalid", "synthetic-public-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, method: init.method, headers: new Headers(init.headers) });
      assert.match(url.pathname, /^\/rest\/v1\/(companies|contacts|activities|prospect_activities)$/);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json", "Content-Range": "*/0" } });
    } },
  });
  const result = await fetchOperationalMetrics(client, signal());
  assert.equal(result.coverage.status, "available");
  assert.equal(result.coverage.percentage, null);
  assert.equal(result.overdue.count, 0);
  assert.equal(requests.length, 4);
  for (const request of requests) {
    assert.equal(request.method, "GET");
    assert.equal(request.url.searchParams.get("order"), "id.asc");
    assert.equal(request.url.searchParams.get("offset"), "0");
    assert.equal(request.url.searchParams.get("limit"), "500");
    assert.match(request.headers.get("prefer"), /count=exact/);
    assert.doesNotMatch(request.url.searchParams.get("select"), /notes|\*/);
  }
});

test("cliente Supabase real no reintenta fallos HTTP automáticamente", async () => {
  let requests = 0;
  const client = createClient("https://qe-metric-test.invalid", "synthetic-public-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async () => {
      requests += 1;
      return new Response(JSON.stringify({ message: "synthetic failure", code: "test" }), {
        status: 503, headers: { "Content-Type": "application/json" },
      });
    } },
  });
  const result = await fetchOperationalMetrics(client, signal());
  assert.equal(requests, 4);
  assert.equal(result.coverage.status, "unavailable");
  assert.equal(result.overdue.status, "unavailable");
});
