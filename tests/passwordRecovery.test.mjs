import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RECOVERY_REQUEST_CONFIRMATION,
  recoveryRedirectUrl,
  validateRecoveryPassword,
} from "../src/features/crm/passwordRecovery.ts";

test("el enlace de recuperación vuelve al origen exacto", () => {
  assert.equal(recoveryRedirectUrl("https://preview.example"), "https://preview.example/restablecer-clave");
});

test("la contraseña nueva exige dos campos iguales y no vacíos", () => {
  assert.equal(validateRecoveryPassword("", ""), "Completa ambos campos.");
  assert.equal(validateRecoveryPassword("clave-uno", "clave-dos"), "Las contraseñas no coinciden.");
  assert.equal(validateRecoveryPassword("clave-nueva", "clave-nueva"), null);
});

test("la confirmación de solicitud no revela si existe la cuenta", () => {
  assert.match(RECOVERY_REQUEST_CONFIRMATION, /si el correo corresponde a una cuenta/i);
});

test("el acceso principal enlaza la recuperación", async () => {
  const source = await readFile("src/app/page.tsx", "utf8");
  assert.match(source, /href="\/recuperar-clave"/);
});

test("la solicitud de recuperación usa Supabase sin revelar cuentas", async () => {
  const source = await readFile("src/app/recuperar-clave/page.tsx", "utf8");
  assert.match(source, /resetPasswordForEmail\(/);
  assert.match(source, /recoveryRedirectUrl\(window\.location\.origin\)/);
  assert.match(source, /RECOVERY_REQUEST_CONFIRMATION/);
  assert.doesNotMatch(source, /service_role|console\.log|pedro\.giraldo@/);
});

test("el cambio exige sesión y autorización CRM antes de actualizar", async () => {
  const source = await readFile("src/app/restablecer-clave/page.tsx", "utf8");
  assert.match(source, /auth\.getSession\(\)/);
  assert.match(source, /rpc\("get_crm_session_context"\)/);
  assert.match(source, /parseCrmSessionContext\(access\.data\)\?\.authorized !== true/);
  assert.match(source, /validateRecoveryPassword\(password, confirmation\)/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /auth\.signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(source, /service_role|console\.log|location\.hash|pedro\.giraldo@/);
});

test("el smoke HTTP cubre ambas rutas públicas de recuperación", async () => {
  const source = await readFile("scripts/smoke.mjs", "utf8");
  assert.match(source, /"\/recuperar-clave"/);
  assert.match(source, /"\/restablecer-clave"/);
});
