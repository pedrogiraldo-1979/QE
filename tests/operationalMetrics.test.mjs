import assert from "node:assert/strict";
import test from "node:test";

import * as metrics from "../src/features/crm/operationalMetrics.ts";

const { calculateCompanyContactCoverage, calculateOverdueFollowUps } = metrics;

const complete = (rows) => ({ status: "complete", rows });
const companies = complete([{ id: "company-a" }, { id: "company-b" }, { id: "company-c" }]);
const contact = (overrides = {}) => ({
  company_id: "company-a", full_name: "Contacto sintético", email: null, phone: null, ...overrides,
});

test("D01 cuenta empresas distintas con nombre y al menos un canal válido", () => {
  assert.deepEqual(calculateCompanyContactCoverage(companies, complete([
    contact({ email: "test@example.invalid" }),
    contact({ company_id: "company-b", phone: "+57 (300) 000-0000" }),
  ])), { status: "available", numerator: 2, denominator: 3, percentage: 2 / 3 * 100 });
});

test("D01 base vacía significa sin base, no cero por ciento", () => {
  assert.deepEqual(calculateCompanyContactCoverage(complete([]), complete([])), {
    status: "available", numerator: 0, denominator: 0, percentage: null,
  });
});

test("D01 base existente sin contactos sí tiene cobertura cero", () => {
  assert.deepEqual(calculateCompanyContactCoverage(companies, complete([])), {
    status: "available", numerator: 0, denominator: 3, percentage: 0,
  });
});

for (const [name, fields, expected] of [
  ["nombre vacío", { full_name: "  ", email: "test@example.invalid" }, 0],
  ["email inválido", { email: "incorrecto" }, 0],
  ["varios emails", { email: "a@example.invalid;b@example.invalid" }, 0],
  ["teléfono de seis dígitos", { phone: "123-456" }, 0],
  ["teléfono de siete dígitos", { phone: "123-4567" }, 1],
  ["teléfono sin dígitos", { phone: "abcdefg" }, 0],
  ["email inválido y teléfono válido", { email: "incorrecto", phone: "1234567" }, 1],
  ["email válido con espacios exteriores", { email: " test@example.invalid " }, 1],
  ["ambos canales ausentes", {}, 0],
]) {
  test(`D01 valida ${name}`, () => {
    assert.equal(calculateCompanyContactCoverage(companies, complete([contact(fields)])).numerator, expected);
  });
}

test("D01 no duplica empresas ni cuenta contactos huérfanos", () => {
  const result = calculateCompanyContactCoverage(complete([{ id: "company-a" }, { id: "company-a" }]), complete([
    contact({ email: "test@example.invalid" }), contact({ phone: "1234567" }),
    contact({ company_id: "orphan", email: "test@example.invalid" }),
    contact({ company_id: null, phone: "1234567" }),
  ]));
  assert.deepEqual(result, { status: "available", numerator: 1, denominator: 1, percentage: 100 });
});

for (const status of ["error", "incomplete"]) {
  for (const source of ["companies", "contacts"]) {
    test(`D01 no muestra cifras cuando ${source} está ${status}`, () => {
      assert.deepEqual(calculateCompanyContactCoverage(
        source === "companies" ? { status } : companies,
        source === "contacts" ? { status } : complete([]),
      ), { status: "unavailable", reason: status === "error" ? "source-error" : "incomplete-source" });
    });
  }
}

test("D01 sólo devuelve agregados y no modifica entradas", () => {
  const companyRows = Object.freeze([Object.freeze({ id: "company-a" })]);
  const contactRows = Object.freeze([Object.freeze(contact({ phone: "1234567" }))]);
  assert.deepEqual(Object.keys(calculateCompanyContactCoverage(complete(companyRows), complete(contactRows))).sort(),
    ["denominator", "numerator", "percentage", "status"]);
  assert.equal(contactRows[0].phone, "1234567");
});

const asOf = new Date("2026-10-10T12:00:00Z");
const followUp = (overrides = {}) => ({
  kind: "follow_up", dueDate: "2026-10-09", completed: false, ...overrides,
});

test("D03 suma acciones abiertas vencidas de empresas y prospectos", () => {
  assert.deepEqual(calculateOverdueFollowUps(complete([followUp()]), complete([followUp()]), asOf),
    { status: "available", count: 2 });
});

for (const [name, fields] of [
  ["nota", { kind: "note" }], ["completada", { completed: true }],
  ["sin fecha", { dueDate: null }], ["hoy", { dueDate: "2026-10-10" }],
  ["futura", { dueDate: "2026-10-11" }],
]) {
  test(`D03 excluye actividad ${name}`, () => {
    assert.deepEqual(calculateOverdueFollowUps(complete([followUp(fields)]), complete([]), asOf),
      { status: "available", count: 0 });
  });
}

test("D03 cambia de día en Bogotá, no a medianoche UTC", () => {
  const source = complete([followUp()]);
  assert.deepEqual(calculateOverdueFollowUps(source, complete([]), new Date("2026-10-10T04:59:59Z")),
    { status: "available", count: 0 });
  assert.deepEqual(calculateOverdueFollowUps(source, complete([]), new Date("2026-10-10T05:00:00Z")),
    { status: "available", count: 1 });
});

test("D03 admite fechas civiles válidas de año bisiesto", () => {
  assert.deepEqual(calculateOverdueFollowUps(complete([followUp({ dueDate: "2024-02-29" })]), complete([]), asOf),
    { status: "available", count: 1 });
});

for (const dueDate of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-09T00:00:00Z", "", "incorrecta"]) {
  test(`D03 rechaza fecha civil inválida ${JSON.stringify(dueDate)}`, () => {
    assert.deepEqual(calculateOverdueFollowUps(complete([followUp({ dueDate })]), complete([]), asOf),
      { status: "unavailable", reason: "invalid-input" });
  });
}

test("D03 no interpreta una finalización desconocida como pendiente", () => {
  assert.deepEqual(calculateOverdueFollowUps(complete([followUp({ completed: null })]), complete([]), asOf),
    { status: "unavailable", reason: "invalid-input" });
});

test("D03 no usa fecha implícita si la referencia es inválida", () => {
  assert.deepEqual(calculateOverdueFollowUps(complete([]), complete([]), new Date("incorrecta")),
    { status: "unavailable", reason: "invalid-input" });
});

for (const status of ["error", "incomplete"]) {
  for (const source of ["companies", "prospects"]) {
    test(`D03 no muestra cifras cuando actividades de ${source} están ${status}`, () => {
      assert.deepEqual(calculateOverdueFollowUps(
        source === "companies" ? { status } : complete([followUp()]),
        source === "prospects" ? { status } : complete([followUp()]), asOf,
      ), { status: "unavailable", reason: status === "error" ? "source-error" : "incomplete-source" });
    });
  }
}

test("D03 entradas completas vacías significan cero", () => {
  assert.deepEqual(calculateOverdueFollowUps(complete([]), complete([]), asOf), { status: "available", count: 0 });
});

test("D03 sólo devuelve agregados y no modifica entradas o fecha de referencia", () => {
  const rows = Object.freeze([Object.freeze(followUp())]);
  const originalTime = asOf.getTime();
  assert.deepEqual(calculateOverdueFollowUps(complete(rows), complete(rows), asOf), { status: "available", count: 2 });
  assert.equal(asOf.getTime(), originalTime);
  assert.equal(rows[0].completed, false);
});
