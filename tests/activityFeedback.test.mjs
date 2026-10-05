import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/ActivitiesOperationalWorkbench.tsx", import.meta.url), "utf8");

// Exercise the existing component handlers without mounting its DOM bridge.
// Only the external database transport and React state setters are substituted.
function harness({ readError = null, writeError = null, inFlight = false, returnedRows = [{ id: "synthetic" }], throwWrite = false } = {}) {
  let message = "Mensaje anterior";
  let saving = false;
  let editing = "synthetic";
  let draft = "2026-10-04";
  const pendingFocusRef = { current: null };
  const writes = [];
  const selections = [];
  let reloads = 0;
  const from = (table) => ({
    select: () => ({
      order: () => {
        reloads += 1;
        const result = { data: [], error: readError };
        return { ...result, limit: () => result };
      },
    }),
    update: (patch) => ({ eq: (column, id) => {
      writes.push({ table, patch, column, id });
      const response = () => {
        if (throwWrite) throw new Error("Detalle privado de transporte");
        return { data: returnedRows, error: writeError };
      };
      return {
        then: (resolve, reject) => Promise.resolve().then(response).then(resolve, reject),
        select: async (columns) => { selections.push(columns); return response(); },
      };
    } }),
  });
  const loader = source.slice(source.indexOf("  async function loadActivities("), source.indexOf("  const companyById"));
  const handlers = source.slice(source.indexOf("  async function completeActivity("), source.indexOf("  if (!active || !container)"));
  const validator = source.includes("function isValidActivityDate(") ? source.slice(source.indexOf("function isValidActivityDate(")) : "function isValidActivityDate() { return false; }";
  const js = ts.transpileModule(`${validator}\n${loader}\n${handlers}\nreturn { loadActivities, completeActivity, rescheduleActivity, cancelReschedule, isValidActivityDate };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const actions = new Function("supabase", "setLoading", "setMessage", "setData", "window", "today", "REFERENCE_ENTITY_LIMIT", "OPERATIONAL_ACTIVITY_FEED_LIMIT", "saveInFlightRef", "setSaving", "setRescheduleTarget", "pendingFocusRef", "rescheduleTarget", "setDraftDate", js)(
    { from }, () => {}, (value) => { message = value; }, () => {}, { prompt: () => "2026-10-04" }, "2026-10-03", 100, 100,
    { current: inFlight }, (value) => { saving = value; }, (value) => { editing = value; }, pendingFocusRef,
    { id: "synthetic", source: "cliente" }, (value) => { draft = value; },
  );
  return { ...actions, writes, selections, reloads: () => reloads, message: () => message, saving: () => saving, editing: () => editing, draft: () => draft, pendingFocusRef };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const source of ["cliente", "prospecto"]) {
  test(`completar ${source} conserva la confirmación después de recargar`, async () => {
    const h = harness();
    await h.completeActivity({ id: "synthetic", source });
    await settle();
    assert.equal(h.message(), "Actividad completada.");
    assert.deepEqual(h.selections, ["id"]);
    assert.deepEqual(h.writes, [{ table: source === "cliente" ? "activities" : "prospect_activities", patch: { completed: true }, column: "id", id: "synthetic" }]);
  });
  test(`reprogramar ${source} conserva la confirmación y el contrato de actualización`, async () => {
    const h = harness();
    await h.rescheduleActivity({ id: "synthetic", source, due_date: null }, "2026-10-04");
    await settle();
    assert.equal(h.message(), "Actividad reprogramada.");
    assert.deepEqual(h.selections, ["id"]);
    assert.deepEqual(h.writes[0].patch, { due_date: "2026-10-04", completed: false });
    assert.equal(h.writes[0].table, source === "cliente" ? "activities" : "prospect_activities");
  });
}

test("actualizar manualmente limpia el mensaje anterior", async () => {
  const h = harness();
  await h.loadActivities();
  assert.equal(h.message(), null);
});

test("un error de recarga reemplaza el éxito, sin ocultarlo", async () => {
  const h = harness({ readError: { message: "Fallo sintético de lectura" } });
  await h.completeActivity({ id: "synthetic", source: "cliente" });
  await settle();
  assert.equal(h.message(), "Fallo sintético de lectura");
});

test("una fecha vacía, inválida o imposible no muta la actividad", async () => {
  for (const date of ["", "04/10/2026", "2026-02-29", "2026-04-31", "0000-01-01"]) {
    const h = harness();
    await h.rescheduleActivity({ id: "synthetic", source: "cliente" }, date);
    assert.equal(h.writes.length, 0);
    assert.equal(h.message(), "Selecciona una fecha válida.");
  }
});

test("valida fechas reales, bisiestos y fechas pasadas sin imponer nueva regla comercial", () => {
  const h = harness();
  for (const date of ["2024-02-29", "2026-10-04", "0001-01-01", "9999-12-31"]) assert.equal(h.isValidActivityDate(date), true, date);
});

test("reprogramar bloquea escrituras mientras ya hay un guardado en curso", async () => {
  const h = harness({ inFlight: true });
  await h.rescheduleActivity({ id: "synthetic", source: "cliente" }, "2026-10-04");
  assert.equal(h.writes.length, 0);
});

test("un error conserva el formulario de reprogramación y termina el estado de guardado", async () => {
  const h = harness({ writeError: { message: "Detalle privado sintético" } });
  await h.rescheduleActivity({ id: "synthetic", source: "cliente" }, "2026-10-04");
  assert.equal(h.message(), "No se pudo confirmar la actualización de la actividad. Actualiza la lista antes de intentar de nuevo.");
  assert.equal(h.editing(), "synthetic");
  assert.equal(h.saving(), false);
});

test("el selector sustituye el prompt y permite cancelación sin guardar", () => {
  assert.doesNotMatch(source, /window\.prompt/);
  assert.match(source, /type="date"/);
  assert.match(source, /Nueva fecha de vencimiento/);
  assert.match(source, /onClick=\{cancelReschedule\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /role="status"/);
});

test("cancelar descarta la fecha sin mutar y prepara retorno de foco", () => {
  const h = harness();
  h.cancelReschedule();
  assert.equal(h.writes.length, 0);
  assert.equal(h.editing(), null);
  assert.equal(h.draft(), "");
  assert.equal(h.pendingFocusRef.current, "activity-reschedule-cliente-synthetic");
});

test("el retorno de foco espera a que termine también el guardado", () => {
  assert.match(source, /if \(!active \|\| loading \|\| saving \|\| rescheduleTarget \|\| !pendingFocusRef\.current\) return;/);
});

test("un fallo al guardar no muestra confirmación de éxito", async () => {
  const h = harness({ writeError: { message: "Fallo sintético de escritura" } });
  await h.completeActivity({ id: "synthetic", source: "cliente" });
  assert.equal(h.message(), "No se pudo confirmar la actualización de la actividad. Actualiza la lista antes de intentar de nuevo.");
});

for (const activitySource of ["cliente", "prospecto"]) {
  for (const action of ["completeActivity", "rescheduleActivity"]) {
    for (const [scenario, options] of [
      ["cero filas", { returnedRows: [] }],
      ["respuesta nula", { returnedRows: null }],
      ["ID distinto", { returnedRows: [{ id: "different" }] }],
      ["varias filas", { returnedRows: [{ id: "synthetic" }, { id: "different" }] }],
      ["error explícito", { writeError: { message: "Detalle privado" } }],
      ["excepción de transporte", { throwWrite: true }],
    ]) {
      test(`${action} ${activitySource}: ${scenario} no confirma ni recarga ni reintenta`, async () => {
        const h = harness(options);
        await h[action]({ id: "synthetic", source: activitySource }, "2026-10-04");
        await settle();
        assert.equal(h.message(), "No se pudo confirmar la actualización de la actividad. Actualiza la lista antes de intentar de nuevo.");
        assert.equal(h.reloads(), 0);
        assert.equal(h.writes.length, 1);
        assert.equal(h.saving(), false);
        assert.deepEqual(h.selections, ["id"]);
        if (action === "rescheduleActivity") {
          assert.equal(h.editing(), "synthetic");
          assert.equal(h.draft(), "2026-10-04");
          assert.equal(h.pendingFocusRef.current, null);
        }
      });
    }
  }
}
