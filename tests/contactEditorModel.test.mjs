import assert from "node:assert/strict";
import test from "node:test";
import { prepareContactUpdate } from "../src/features/crm/contactEditorModel.ts";

test("rechaza un nombre vacío", () => {
  assert.deepEqual(prepareContactUpdate({
    fullName: "   ", role: "", email: "", phone: "", notes: "",
  }), { ok: false, message: "El contacto necesita nombre." });
});

test("normaliza nombre, email y campos opcionales como el bridge vigente", () => {
  assert.deepEqual(prepareContactUpdate({
    fullName: "  Ana   Pérez  ", role: "  Compras  ", email: "  ANA@EXAMPLE.INVALID ",
    phone: "  300 123 4567 ", notes: "  Nota conservada  ",
  }), {
    ok: true,
    patch: {
      full_name: "Ana Pérez", role: "Compras", email: "ana@example.invalid",
      phone: "300 123 4567", notes: "Nota conservada",
    },
  });
});

test("convierte opcionales vacíos en null y preserva saltos internos de las notas", () => {
  const result = prepareContactUpdate({
    fullName: " Ana ", role: " ", email: " ", phone: " ", notes: "  Nota uno\nNota dos  ",
  });
  assert.deepEqual(result, {
    ok: true,
    patch: { full_name: "Ana", role: null, email: null, phone: null, notes: "Nota uno\nNota dos" },
  });
});
