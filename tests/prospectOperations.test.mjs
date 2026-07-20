import assert from "node:assert/strict";
import test from "node:test";

import {
  findPossibleCompanyMatches,
  getProspectDisplayName,
  isConvertedProspect,
  normalizeProspectStatus,
  validateProspectContact,
} from "../src/lib/prospectOperations.ts";

test("normaliza estados heredados al workflow canónico", () => {
  assert.equal(normalizeProspectStatus("por_validar"), "por_revisar");
  assert.equal(normalizeProspectStatus("calificado"), "por_revisar");
  assert.equal(normalizeProspectStatus("contactado"), "contacto_pendiente");
  assert.equal(normalizeProspectStatus("cotizado"), "contacto_pendiente");
  assert.equal(normalizeProspectStatus("convertido"), "convertido_cliente");
  assert.equal(normalizeProspectStatus("estado_desconocido"), "nuevo");
});

test("conserva estados canónicos", () => {
  assert.equal(normalizeProspectStatus("ok_prospecto"), "ok_prospecto");
  assert.equal(normalizeProspectStatus("cliente_actual_excluir"), "cliente_actual_excluir");
  assert.equal(normalizeProspectStatus("descartado"), "descartado");
});

test("reconoce conversiones por estado heredado, canónico o vínculo", () => {
  assert.equal(isConvertedProspect({ status: "convertido" }), true);
  assert.equal(isConvertedProspect({ status: "convertido_cliente" }), true);
  assert.equal(isConvertedProspect({ status: "nuevo", converted_company_id: "company-1" }), true);
  assert.equal(isConvertedProspect({ status: "nuevo", converted_company_id: null }), false);
});

test("prefiere company_name y conserva fallback heredado", () => {
  assert.equal(getProspectDisplayName({ company_name: "Empresa nueva", name: "Empresa antigua" }), "Empresa nueva");
  assert.equal(getProspectDisplayName({ name: "Empresa antigua" }), "Empresa antigua");
  assert.equal(getProspectDisplayName({ legal_name: "Razón social" }), "Razón social");
});

test("valida contacto CRM y de campaña por separado", () => {
  assert.deepEqual(validateProspectContact({ full_name: "Ana", phone: "3001234567" }), {
    crmValid: true,
    campaignValid: false,
    missing: [],
  });
  assert.equal(validateProspectContact({ full_name: "Ana", email: "ana@example.com" }).campaignValid, true);
  assert.equal(validateProspectContact({ full_name: "Ana", email: "correo-invalido" }).campaignValid, false);
});

test("detecta coincidencias de empresa por señales normalizadas", () => {
  const matches = findPossibleCompanyMatches(
    { company_name: "Café del Parque", nit: "900.123.456-7", phone: "+57 300 123 4567" },
    [
      { id: "match", name: "Cafe del Parque", nit: "9001234567", phone: "3001234567" },
      { id: "other", name: "Hotel Central", nit: "111" },
    ],
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].company.id, "match");
  assert.deepEqual(matches[0].signals, ["nit", "phone", "name"]);
});
