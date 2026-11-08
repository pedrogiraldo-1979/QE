import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildActivityInsert,
  buildActivityTargets,
  filterActivityTargets,
  normalizeActivitySearch,
  validateActivityEntry,
} from "../src/features/crm/activityEntryModel.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

async function read(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

test("combina empresas y prospectos conservando identidad y origen distintos", () => {
  const targets = buildActivityTargets(
    [{ id: "company-1", name: "Café Andino", segment: "Hotel" }],
    [{ id: "prospect-1", company_name: "Café Andino", segment: "Restaurante" }],
  );

  assert.deepEqual(targets, [
    { key: "cliente:company-1", id: "company-1", name: "Café Andino", segment: "Hotel", source: "cliente" },
    { key: "prospecto:prospect-1", id: "prospect-1", name: "Café Andino", segment: "Restaurante", source: "prospecto" },
  ]);
});

test("la búsqueda ignora tildes, conserva el ranking y limita a ocho resultados", () => {
  const targets = buildActivityTargets(
    Array.from({ length: 10 }, (_, index) => ({ id: `c${index}`, name: `Café Andino ${index}`, segment: "Hotel" })),
    [{ id: "p1", company_name: "Café Andino", segment: "Restaurante" }],
  );

  assert.equal(normalizeActivitySearch("CAFÉ   ANDINO"), "cafe andino");
  const results = filterActivityTargets(targets, "cafe andino");
  assert.equal(results.length, 8);
  assert.equal(results[0].key, "prospecto:p1");
  assert.ok(results.some((target) => target.key === "cliente:c0"));
});

test("valida destino y nota antes de crear una actividad", () => {
  assert.equal(validateActivityEntry(null, "nota válida"), "Selecciona un cliente o prospecto desde los resultados de búsqueda.");
  assert.equal(validateActivityEntry({ key: "cliente:c1" }, "  \n "), "Agrega una nota breve para la actividad.");
  assert.equal(validateActivityEntry({ key: "cliente:c1" }, " Llamar  mañana "), null);
});

test("el payload dirige cada actividad a su tabla y no la marca completada", () => {
  const fields = { activityType: "call", dueDate: "2026-10-12", notes: "  Llamar  mañana " };

  assert.deepEqual(buildActivityInsert({ id: "c1", source: "cliente" }, fields), {
    table: "activities",
    payload: { company_id: "c1", activity_type: "call", notes: "Llamar mañana", due_date: "2026-10-12", completed: false },
  });
  assert.deepEqual(buildActivityInsert({ id: "p1", source: "prospecto" }, { ...fields, dueDate: "" }), {
    table: "prospect_activities",
    payload: { prospect_id: "p1", activity_type: "call", notes: "Llamar mañana", due_date: null, completed: false },
  });
});

test("/agregar es propietario del formulario React y deja de cargar el bridge DOM", async () => {
  const route = await read("src/app/agregar/page.tsx");
  const bridges = await read("src/components/CrmClientBridges.tsx");

  assert.match(route, /AddActivityEntryForm/);
  assert.doesNotMatch(bridges, /AddActivityEntryBridge/);
  assert.doesNotMatch(bridges, /MutationObserver|createPortal/);
  assert.match(route, /activityTriggerRef\.current\?\.focus\(\)/);
});

test("el formulario evita envíos simultáneos y anuncia estados de resultado", async () => {
  const form = await read("src/components/crm/AddActivityEntryForm.tsx");

  assert.match(form, /savingRef/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /disabled=\{saving \|\| loading\}/);
  assert.match(form, /activityTitleRef\.current\?\.focus\(\)/);
  assert.match(form, /role="group" aria-label="Resultados de clientes y prospectos"/);
});

