import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/AddActivityEntryBridge.tsx", import.meta.url), "utf8");
const uncertain = "No se pudo confirmar la creación de la actividad. Revisa Actividades antes de intentar de nuevo para evitar duplicados.";
const loadFailure = "No pudimos cargar clientes y prospectos. Cierra y vuelve a abrir esta página para intentar de nuevo.";

// Run the real component handlers; replace only external I/O and React setters.
function harness({ origin = "cliente", write = async () => ({ error: null }), readError = null, throwRead = false, missingTarget = false, notes = "  Nota   sintética  " } = {}) {
  const state = { message: null, saving: false, loading: false, open: true, targetKey: `${origin}:synthetic`, targetSearch: "Entidad sintética", activityType: "call", dueDate: "2026-10-06", notes };
  const writes = [];
  const saveInFlightRef = { current: false };
  const setters = Object.fromEntries(["Message", "Saving", "Loading", "FormOpen", "TargetKey", "TargetSearch", "ActivityType", "DueDate", "Notes", "Companies", "Prospects"].map((name) => [
    `set${name}`, (value) => { state[name === "FormOpen" ? "open" : name[0].toLowerCase() + name.slice(1)] = value; },
  ]));
  const from = (table) => ({
    insert: (payload) => { writes.push({ table, payload }); return write(); },
    select: () => ({ order: () => {
      const result = { data: [], error: readError };
      const then = (resolve, reject) => Promise.resolve().then(() => { if (throwRead) throw new Error("Detalle privado sintético"); return result; }).then(resolve, reject);
      return { ...result, then, limit: () => ({ then }) };
    } }),
  });
  const loader = source.slice(source.indexOf("  async function loadTargets("), source.indexOf("  const targets ="));
  const submit = source.slice(source.indexOf("  async function handleSubmit("), source.indexOf("  const selectedTarget = useMemo"));
  const fallbackClose = source.includes("  function closeForm(") ? "" : "function closeForm() { setFormOpen(false); }";
  const js = ts.transpileModule(`${loader}\n${submit}\n${fallbackClose}\nreturn { loadTargets, handleSubmit, closeForm };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const scope = { supabase: { from }, saveInFlightRef, loading: false, targets: missingTarget ? [] : [{ key: state.targetKey, id: "synthetic", source: origin }], targetKey: state.targetKey, notes, activityType: state.activityType, dueDate: state.dueDate, REFERENCE_ENTITY_LIMIT: 1000, ...setters };
  const actions = new Function(...Object.keys(scope), js)(...Object.values(scope));
  return { ...actions, state, writes, saveInFlightRef, submit: () => actions.handleSubmit({ preventDefault() {} }) };
}

for (const origin of ["cliente", "prospecto"]) {
  test(`crear actividad ${origin}: excepción libera controles sin borrar el formulario`, async () => {
    const h = harness({ origin, write: async () => { throw new Error("Detalle privado sintético"); } });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.saving, false);
    assert.equal(h.saveInFlightRef.current, false);
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.notes, "  Nota   sintética  ");
    assert.equal(h.state.targetKey, `${origin}:synthetic`);
    assert.equal(h.state.dueDate, "2026-10-06");
    assert.equal(h.writes.length, 1);
  });

  test(`crear actividad ${origin}: error no expone detalles ni reintenta`, async () => {
    const h = harness({ origin, write: async () => ({ error: { message: "Detalle privado sintético" } }) });
    await h.submit();
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.saving, false);
    assert.equal(h.state.notes, "  Nota   sintética  ");
    assert.equal(h.writes.length, 1);
  });

  test(`crear actividad ${origin}: bloquea cerrar y doble envío hasta terminar`, async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const h = harness({ origin, write: () => pending });
    const first = h.submit();
    assert.equal(h.state.saving, true);
    h.closeForm();
    const second = h.submit();
    const protectedState = { open: h.state.open, count: h.writes.length };
    finish({ error: null });
    await Promise.all([first, second]);
    assert.deepEqual(protectedState, { open: true, count: 1 });
    assert.equal(h.state.saving, false);
    assert.equal(h.saveInFlightRef.current, false);
    assert.equal(h.state.notes, "");
    assert.equal(h.state.message, origin === "prospecto" ? "Actividad creada para prospecto." : "Actividad creada para cliente actual.");
    assert.deepEqual(h.writes, [{ table: origin === "prospecto" ? "prospect_activities" : "activities", payload: { [origin === "prospecto" ? "prospect_id" : "company_id"]: "synthetic", activity_type: "call", notes: "Nota sintética", due_date: "2026-10-06", completed: false } }]);
    h.closeForm();
    assert.equal(h.state.open, false);
  });
}

test("carga de destinos: excepción termina carga y muestra aviso genérico", async () => {
  const h = harness({ throwRead: true });
  await assert.doesNotReject(h.loadTargets());
  assert.equal(h.state.loading, false);
  assert.equal(h.state.message, loadFailure);
  assert.equal(h.writes.length, 0);
});

test("carga de destinos: error devuelto no expone detalles", async () => {
  const h = harness({ readError: { message: "Detalle privado sintético" } });
  await h.loadTargets();
  assert.equal(h.state.loading, false);
  assert.equal(h.state.message, loadFailure);
});

test("validación conserva el requisito de entidad y nota sin escribir", async () => {
  for (const options of [{ missingTarget: true }, { notes: "   " }]) {
    const h = harness(options);
    await h.submit();
    assert.equal(h.writes.length, 0);
    assert.equal(h.state.saving, false);
  }
});

test("ambas acciones de cierre usan la guarda y se deshabilitan al guardar", () => {
  assert.equal((source.match(/onClick=\{closeForm\} disabled=\{saving\}/g) || []).length, 2);
  assert.match(source, /role="status"/);
});
