import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/prospectos/nuevo/page.tsx", import.meta.url), "utf8");
const uncertain = "No se pudo confirmar la creación del prospecto. Revisa la lista antes de intentar de nuevo para evitar duplicados.";
const loadFailure = "No pudimos cargar las listas. Pulsa Refrescar para intentar de nuevo.";

// Execute real handlers; substitute only external transport, setters and browser query.
function harness({ write = async () => ({ data: { id: "synthetic", company_name: "Empresa" }, error: null }), read = async () => ({ data: [], error: null }), listId = "synthetic-list", companyName = "  Empresa  ", loading = false } = {}) {
  const form = { company_name: companyName, legal_name: "", nit: "", segment: "", city: "", website: "", phone: "", address: "", priority: "B", notes: "  Nota   ficticia " };
  const state = { saving: false, loading, form, message: null, createdProspect: null, selectedListId: listId, lists: [] };
  const saveInFlightRef = { current: false };
  const writes = [];
  const scope = {
    form, selectedListId: listId, lists: [{ id: "synthetic-list", segment: "Segmento", city: "Ciudad", source: "manual" }], loading, saveInFlightRef,
    emptyProspectForm: {}, PROSPECT_COLUMNS: "contract", PROSPECT_LIST_COLUMNS: "list-contract",
    window: { location: { search: "" } },
    supabase: { from: (table) => ({ insert: (payload) => { writes.push({ table, payload }); return { select: () => ({ single: write }) }; }, select: () => ({ order: read }) }) },
    ...Object.fromEntries(["Saving", "Loading", "Message", "CreatedProspect", "Form", "Lists", "SelectedListId"].map(name => [`set${name}`, value => { const key = name[0].toLowerCase() + name.slice(1); state[key] = typeof value === "function" ? value(state[key]) : value; }])),
  };
  const loader = source.slice(source.indexOf("  async function loadLists("), source.indexOf("  async function handleSignIn("));
  const submit = source.slice(source.indexOf("  async function createProspect("), source.indexOf("  function updateField"));
  const helpers = source.slice(source.indexOf("function cleanText("));
  const js = ts.transpileModule(`${loader}\n${submit}\n${helpers}\nreturn { loadLists, createProspect };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const actions = new Function(...Object.keys(scope), js)(...Object.values(scope));
  return { ...actions, state, writes, saveInFlightRef, submit: () => actions.createProspect({ preventDefault() {} }) };
}

for (const mode of ["exception", "returned error"]) {
  test(`alta de prospecto: ${mode} conserva campos y libera controles`, async () => {
    const h = harness({ write: async () => { if (mode === "exception") throw Error("Private detail"); return { data: null, error: { message: "Private detail" } }; } });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.saving, false);
    assert.equal(h.saveInFlightRef.current, false);
    assert.equal(h.state.form.company_name, "  Empresa  ");
    assert.equal(h.state.selectedListId, "synthetic-list");
    assert.equal(h.writes.length, 1);
  });
}

test("alta de prospecto: guarda bloquea dos envíos antes de render y mantiene payload", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ write: () => pending });
  const first = h.submit();
  const second = h.submit();
  const count = h.writes.length;
  assert.equal(h.state.saving, true);
  finish({ data: { id: "synthetic", company_name: "Empresa" }, error: null });
  await Promise.all([first, second]);
  assert.equal(count, 1);
  assert.deepEqual(h.writes[0], { table: "prospects", payload: { list_id: "synthetic-list", company_name: "Empresa", legal_name: null, nit: null, segment: "Segmento", city: "Ciudad", website: null, phone: null, address: null, priority: "B", source: "manual", status: "por_revisar", notes: "Nota ficticia" } });
  assert.equal(h.state.saving, false);
  assert.equal(h.saveInFlightRef.current, false);
  assert.deepEqual(h.state.form, {});
  assert.equal(h.state.createdProspect.id, "synthetic");
});

for (const mode of ["exception", "returned error"]) {
  test(`carga de listas: ${mode} termina loading sin detalle técnico`, async () => {
    const h = harness({ read: async () => { if (mode === "exception") throw Error("Private detail"); return { data: null, error: { message: "Private detail" } }; } });
    await assert.doesNotReject(h.loadLists());
    assert.equal(h.state.loading, false);
    assert.equal(h.state.message, loadFailure);
  });
}

test("alta no escribe durante carga ni sin nombre/lista", async () => {
  for (const options of [{ loading: true }, { companyName: "   " }, { listId: "" }]) {
    const h = harness(options);
    await h.submit();
    assert.equal(h.writes.length, 0);
  }
});

test("carga no cambia listas durante una creación pendiente", async () => {
  let reads = 0;
  const h = harness({ read: async () => { reads++; return { data: [], error: null }; } });
  h.saveInFlightRef.current = true;
  await h.loadLists();
  assert.equal(reads, 0);
});

test("formulario deshabilita campos/cancelación local y anuncia mensajes", () => {
  assert.match(source, /<fieldset disabled=\{saving \|\| loading\}/);
  assert.equal((source.match(/aria-disabled="true"/g) || []).length, 2);
  assert.match(source, /role="status"/);
  assert.match(source, /disabled=\{loading \|\| saving\}/);
});
