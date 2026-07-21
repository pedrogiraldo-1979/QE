import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInternalTestHtml,
  buildZeptoMailRequest,
  findZeptoMailToken,
  INTERNAL_TEST,
  zeptoAuthorization,
  ZEPTOMAIL_SECRET_NAMES,
} from "../supabase/functions/send-internal-update-test/campaign-email.mjs";

test("la prueba de campaña está bloqueada al remitente y destinatario internos", () => {
  const request = buildZeptoMailRequest();

  assert.equal(request.from.address, "ventas@quindioexquisito.com");
  assert.equal(request.to.length, 1);
  assert.equal(request.to[0].email_address.address, "pedro.giraldo@gmail.com");
  assert.equal(INTERNAL_TEST.authorizedUserEmail, "pedro.giraldo@gmail.com");
  assert.match(request.subject, /PRUEBA INTERNA/);
});

test("el correo apunta solamente al formulario sintético aprobado", () => {
  const html = buildInternalTestHtml();

  assert.equal(
    INTERNAL_TEST.formUrl,
    "https://qe-chi.vercel.app/actualizar-datos?token=qe-test-formulario-2026",
  );
  assert.ok(html.includes(INTERNAL_TEST.formUrl));
  assert.ok(html.includes("No corresponde a información de un cliente real"));
});

test("el secret configurado y sus alias producen la autorización esperada", () => {
  assert.ok(ZEPTOMAIL_SECRET_NAMES.includes("ZEPTOMAIL_SEND_TOKEN"));
  assert.equal(
    findZeptoMailToken((name) => name === "ZEPTOMAIL_SEND_TOKEN" ? " token-interno " : undefined),
    "token-interno",
  );
  assert.equal(zeptoAuthorization("token-interno"), "Zoho-enczapikey token-interno");
  assert.equal(
    zeptoAuthorization("Zoho-enczapikey token-interno"),
    "Zoho-enczapikey token-interno",
  );
});
