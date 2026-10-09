import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/prospectos/[listId]/page.tsx", import.meta.url), "utf8");
const uncertain = "No se pudo confirmar la actualización del prospecto. Revisa sus datos antes de intentar de nuevo.";
const original = { id: "synthetic", company_name: "Antes" };
const updated = { ...original, company_name: "Empresa" };

// Execute the production handler; only the external transport and React setters are substituted.
function harness({ response = async () => ({ data: updated, error: null }), selected = original, name = "  Empresa  " } = {}) {
  const editProspect = { company_name: name, legal_name: "", nit: "", segment: "", campaign: "", city: "", website: "", phone: "", address: "", priority: "B", notes: "Nota" };
  const state = { saving: false, message: "Aviso anterior", prospects: [original], form: editProspect };
  const calls = [];
  const prospectEditInFlightRef = { current: false };
  const scope = { selectedProspect: selected, editProspect, prospectEditInFlightRef, PROSPECT_COLUMNS: "contract", nullIfBlank: value => value.trim() || null,
    setSavingProspect: value => { state.saving = value; }, setMessage: value => { state.message = value; }, setProspects: updater => { state.prospects = updater(state.prospects); },
    supabase: { from: table => ({ update: payload => ({ eq: (column, id) => { calls.push({ table, column, id, payload }); return { select: () => ({ single: response }) }; } }) }) },
  };
  const handler = source.slice(source.indexOf("  async function updateSelectedProspect("), source.indexOf("  async function updateProspectStatus("));
  const js = ts.transpileModule(`${handler}\nreturn updateSelectedProspect;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = new Function(...Object.keys(scope), js)(...Object.values(scope));
  return { state, calls, ref: prospectEditInFlightRef, submit: () => run({ preventDefault() {} }) };
}

for (const mode of ["exception", "returned error"]) {
  test(`edición de prospecto: ${mode} conserva formulario y libera controles`, async () => {
    const h = harness({ response: async () => { if (mode === "exception") throw Error("Private detail"); return { data: null, error: { message: "Private detail" } }; } });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.saving, false);
    assert.equal(h.ref.current, false);
    assert.equal(h.state.form.company_name, "  Empresa  ");
    assert.deepEqual(h.state.prospects, [original]);
    assert.equal(h.calls.length, 1);
  });
}

test("edición de prospecto: dos envíos pendientes producen una actualización", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ response: () => pending });
  const first = h.submit();
  const second = h.submit();
  const count = h.calls.length;
  const wasSaving = h.state.saving;
  const clearedMessage = h.state.message;
  finish({ data: updated, error: null });
  await Promise.all([first, second]);
  assert.equal(count, 1);
  assert.equal(wasSaving, true);
  assert.equal(clearedMessage, null);
  assert.equal(h.state.saving, false);
  assert.equal(h.ref.current, false);
  assert.deepEqual(h.state.prospects, [updated]);
  assert.equal(h.state.message, "Prospecto actualizado.");
});

test("edición de prospecto: conserva ID, columnas y payload comercial", async () => {
  const h = harness();
  await h.submit();
  const { updated_at, ...payload } = h.calls[0].payload;
  assert.equal(h.calls[0].table, "prospects");
  assert.equal(h.calls[0].column, "id");
  assert.equal(h.calls[0].id, "synthetic");
  assert.ok(Number.isFinite(Date.parse(updated_at)));
  assert.deepEqual(payload, { company_name: "Empresa", legal_name: null, nit: null, segment: null, campaign: null, city: null, website: null, phone: null, address: null, priority: "B", notes: "Nota" });
});

for (const data of [null, { ...updated, id: "different-synthetic" }]) {
  test(`edición de prospecto: ${data ? "ID distinto" : "respuesta nula"} no confirma éxito`, async () => {
    const h = harness({ response: async () => ({ data, error: null }) });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.deepEqual(h.state.prospects, [original]);
    assert.equal(h.state.saving, false);
  });
}

test("edición de prospecto: conserva validaciones de selección y nombre", async () => {
  for (const options of [{ selected: null }, { name: "   " }]) {
    const h = harness(options);
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.equal(h.ref.current, false);
  }
});

test("edición de prospecto: un fallo permite un intento posterior explícito", async () => {
  let attempts = 0;
  const h = harness({ response: async () => { if (++attempts === 1) throw Error("Private detail"); return { data: updated, error: null }; } });
  await assert.doesNotReject(h.submit());
  await h.submit();
  assert.equal(h.calls.length, 2);
  assert.equal(h.state.message, "Prospecto actualizado.");
});

test("edición de prospecto: controles protegidos sólo en el formulario de edición", () => {
  assert.match(source, /<fieldset disabled=\{savingProspect\} aria-busy=\{savingProspect\}/);
  assert.match(source, /submitLabel=\{savingProspect \? "Guardando" : "Guardar cambios"\}/);
  assert.equal((source.match(/disabled=\{savingProspect\}/g) || []).length, 1);
});
