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
