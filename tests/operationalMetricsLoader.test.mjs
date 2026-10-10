import assert from "node:assert/strict";
import test from "node:test";
import { createOperationalMetricsLoader } from "../src/features/crm/operationalMetricsLoader.ts";

const result = (count) => ({ coverage: { status: "available", numerator: 0, denominator: 0, percentage: null }, overdue: { status: "available", count } });
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("loader publica carga inmediata y resultado agregado", async () => {
  const states = [];
  const request = deferred();
  const loader = createOperationalMetricsLoader(() => request.promise, (state) => states.push(state));
  const pending = loader.refresh();
  assert.deepEqual(states, [{ status: "loading" }]);
  request.resolve(result(1));
  await pending;
  assert.deepEqual(states.at(-1), { status: "ready", metrics: result(1) });
});

test("loader cancela la petición previa y descarta respuestas fuera de orden", async () => {
  const states = [], requests = [], signals = [];
  const loader = createOperationalMetricsLoader((signal) => {
    signals.push(signal); const request = deferred(); requests.push(request); return request.promise;
  }, (state) => states.push(state));
  const first = loader.refresh();
  const second = loader.refresh();
  assert.equal(signals[0].aborted, true);
  requests[1].resolve(result(2)); await second;
  requests[0].resolve(result(1)); await first;
  assert.deepEqual(states.at(-1), { status: "ready", metrics: result(2) });
  assert.equal(states.filter((state) => state.status === "ready").length, 1);
});

test("loader clear elimina resultado y no acepta respuestas pendientes", async () => {
  const states = [], request = deferred();
  let signal;
  const loader = createOperationalMetricsLoader((value) => { signal = value; return request.promise; }, (state) => states.push(state));
  const pending = loader.refresh();
  loader.clear();
  assert.equal(signal.aborted, true);
  await pending;
  request.resolve(result(3));
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { status: "idle" });
});

test("loader sanea excepciones sin conservar el resultado anterior ni diagnósticos", async () => {
  const states = [];
  const loader = createOperationalMetricsLoader(async () => { throw new Error("private token diagnostic"); }, (state) => states.push(state));
  await loader.refresh();
  assert.deepEqual(states.at(-1), { status: "ready", metrics: {
    coverage: { status: "unavailable", reason: "source-error" }, overdue: { status: "unavailable", reason: "source-error" },
  } });
  assert.doesNotMatch(JSON.stringify(states), /private|token|diagnostic/);
});

test("dos instancias de loader no comparten resultados ni abortos", async () => {
  const statesA = [], statesB = [];
  const a = createOperationalMetricsLoader(async () => result(1), (state) => statesA.push(state));
  const b = createOperationalMetricsLoader(async () => result(2), (state) => statesB.push(state));
  await Promise.all([a.refresh(), b.refresh()]);
  a.clear();
  assert.deepEqual(statesB.at(-1), { status: "ready", metrics: result(2) });
});

test("loader termina en indisponible tras 15 segundos aunque el transporte ignore aborto", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const states = [];
  const loader = createOperationalMetricsLoader(() => new Promise(() => {}), (state) => states.push(state));
  const pending = loader.refresh();
  context.mock.timers.tick(15_000);
  await pending;
  assert.equal(states.at(-1).status, "ready");
  assert.equal(states.at(-1).metrics.coverage.status, "unavailable");
  assert.equal(states.at(-1).metrics.overdue.status, "unavailable");
});
