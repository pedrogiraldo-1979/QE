import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/ActivitiesOperationalWorkbench.tsx", import.meta.url), "utf8");

// Exercise the existing component handlers without mounting its DOM bridge.
// Only the external database transport and React state setters are substituted.
function harness({ prompt = "2026-10-04", readError = null, writeError = null } = {}) {
  let message = "Mensaje anterior";
  const writes = [];
  const from = (table) => ({
    select: () => ({
      order: () => {
        const result = { data: [], error: readError };
        return { ...result, limit: () => result };
      },
    }),
    update: (patch) => ({ eq: async (column, id) => {
      writes.push({ table, patch, column, id });
      return { error: writeError };
    } }),
  });
  const loader = source.slice(source.indexOf("  async function loadActivities("), source.indexOf("  const companyById"));
  const handlers = source.slice(source.indexOf("  async function completeActivity("), source.indexOf("  if (!active || !container)"));
  const js = ts.transpileModule(`${loader}\n${handlers}\nreturn { loadActivities, completeActivity, rescheduleActivity };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const actions = new Function("supabase", "setLoading", "setMessage", "setData", "window", "today", "REFERENCE_ENTITY_LIMIT", "OPERATIONAL_ACTIVITY_FEED_LIMIT", js)(
    { from }, () => {}, (value) => { message = value; }, () => {}, { prompt: () => prompt }, "2026-10-03", 100, 100,
  );
  return { ...actions, writes, message: () => message };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const source of ["cliente", "prospecto"]) {
  test(`completar ${source} conserva la confirmación después de recargar`, async () => {
    const h = harness();
    await h.completeActivity({ id: "synthetic", source });
    await settle();
    assert.equal(h.message(), "Actividad completada.");
    assert.deepEqual(h.writes, [{ table: source === "cliente" ? "activities" : "prospect_activities", patch: { completed: true }, column: "id", id: "synthetic" }]);
  });
  test(`reprogramar ${source} conserva la confirmación y el contrato de actualización`, async () => {
    const h = harness();
    await h.rescheduleActivity({ id: "synthetic", source, due_date: null });
    await settle();
    assert.equal(h.message(), "Actividad reprogramada.");
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

test("cancelar o introducir formato inválido no muta la actividad", async () => {
  for (const prompt of [null, "", "04/10/2026"]) {
    const h = harness({ prompt });
    await h.rescheduleActivity({ id: "synthetic", source: "cliente" });
    assert.equal(h.writes.length, 0);
    assert.equal(h.message(), prompt ? "Usa formato YYYY-MM-DD." : "Mensaje anterior");
  }
});

test("un fallo al guardar no muestra confirmación de éxito", async () => {
  const h = harness({ writeError: { message: "Fallo sintético de escritura" } });
  await h.completeActivity({ id: "synthetic", source: "cliente" });
  assert.equal(h.message(), "Fallo sintético de escritura");
});
