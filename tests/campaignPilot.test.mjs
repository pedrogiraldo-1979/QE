import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildFormUrl,
  buildPilotHtml,
  buildZeptoMailRequest,
  PILOT_CONTROL,
  validatePilotBatch,
} from "../supabase/functions/send-approved-campaign-pilot/pilot-email.mjs";

function recipient(overrides = {}) {
  return {
    sequence: 1,
    recipientEmail: "compras@example.com",
    linkEmail: "compras@example.com",
    recipientName: "Persona de Compras",
    companyName: "Empresa de Prueba",
    token: "token-sintetico",
    status: "approved",
    isActive: true,
    expiresAt: null,
    respondedAt: null,
    ...overrides,
  };
}

function validBatch() {
  return Array.from({ length: 5 }, (_, index) => recipient({
    sequence: index + 1,
    recipientEmail: `compras${index + 1}@example.com`,
    linkEmail: `compras${index + 1}@example.com`,
    token: `token-sintetico-${index + 1}`,
  }));
}

test("el piloto exige exactamente cinco destinatarios únicos, aprobados y activos", () => {
  assert.equal(validatePilotBatch(validBatch()), "");
  assert.match(validatePilotBatch(validBatch().slice(0, 4)), /exactamente 5/);
  assert.match(validatePilotBatch(validBatch().map((item, index) => (
    index === 4 ? { ...item, recipientEmail: "compras1@example.com", linkEmail: "compras1@example.com" } : item
  ))), /duplicad/);
  assert.match(validatePilotBatch(validBatch().map((item, index) => (
    index === 2 ? { ...item, status: "sent" } : item
  ))), /dejó de estar disponible/);
});

test("cada request de ZeptoMail contiene un solo destinatario y el remitente fijo", () => {
  const request = buildZeptoMailRequest(recipient());
  assert.equal(request.from.address, "ventas@quindioexquisito.com");
  assert.equal(request.to.length, 1);
  assert.equal(request.to[0].email_address.address, "compras@example.com");
  assert.equal(request.subject, PILOT_CONTROL.subject);
});

test("la plantilla escapa datos y construye un enlace individual", () => {
  const item = recipient({ recipientName: "<script>alert(1)</script>" });
  const html = buildPilotHtml(item);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes(buildFormUrl(item.token)));
});

test("la migración mantiene la lista privada y reclama los cinco de forma atómica", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260721023246_add_approved_campaign_pilot.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all privileges[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /total_count <> 5 or approved_count <> 5/);
  assert.match(migration, /grant execute on function public\.claim_campaign_pilot_batch\(uuid\)[\s\S]+to service_role/);
});

test("el repositorio no contiene destinatarios ni tokens reales del piloto", () => {
  const moduleSource = readFileSync(
    new URL("../supabase/functions/send-approved-campaign-pilot/pilot-email.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(!/qe-[a-z0-9-]+-\d{6,}-2026/.test(moduleSource));
  assert.ok(!/recipientEmail:\s*["'][^"']+@/i.test(moduleSource));
});
