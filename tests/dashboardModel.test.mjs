import assert from "node:assert/strict";
import test from "node:test";

import {
  filterCustomerResponses,
  getContactIssues,
  getNextActivity,
  getResponseChanges,
  isOverdue,
  normalizeStatus,
  normalizeUrl,
} from "../src/features/crm/dashboardModel.ts";

test("normaliza estados de cliente desconocidos sin alterar los canónicos", () => {
  assert.equal(normalizeStatus("interesado"), "interesado");
  assert.equal(normalizeStatus("estado-inexistente"), "nuevo");
  assert.equal(normalizeStatus(null), "nuevo");
});

test("selecciona la próxima actividad abierta sin mutar el orden original", () => {
  const activities = [
    { id: "sin-fecha", due_date: null, completed: false },
    { id: "posterior", due_date: "2026-07-22", completed: false },
    { id: "primera", due_date: "2026-07-20", completed: false },
    { id: "cerrada", due_date: "2026-07-19", completed: true },
  ];

  assert.equal(getNextActivity(activities)?.id, "primera");
  assert.deepEqual(activities.map((activity) => activity.id), ["sin-fecha", "posterior", "primera", "cerrada"]);
});

test("calcula vencimiento con una fecha de referencia controlada", () => {
  const now = new Date("2026-07-20T12:00:00");
  assert.equal(isOverdue({ due_date: "2026-07-19", completed: false }, now), true);
  assert.equal(isOverdue({ due_date: "2026-07-20", completed: false }, now), false);
  assert.equal(isOverdue({ due_date: "2026-07-19", completed: true }, now), false);
});

test("detecta calidad de contacto y conserva normalización de enlaces", () => {
  assert.deepEqual(getContactIssues({ id: "1", email: "a@b.com; c@d.com", role: null, phone: null }), [
    "Rol pendiente",
    "Teléfono pendiente",
    "Email múltiple o inválido",
  ]);
  assert.equal(normalizeUrl("quindioexquisito.com"), "https://quindioexquisito.com");
  assert.equal(normalizeUrl("https://quindioexquisito.com"), "https://quindioexquisito.com");
});

test("interpreta respuestas de actualización desde payload o campos directos", () => {
  const response = {
    response_id: 42,
    nombre_cliente: "Cliente Uno",
    payload: {
      razon_social_actual: "Cliente Uno SAS",
      razon_social_nueva: "Cliente Uno S.A.S.",
    },
  };

  assert.deepEqual(getResponseChanges(response), [
    { label: "Razón social", currentValue: "Cliente Uno SAS", newValue: "Cliente Uno S.A.S." },
  ]);
  assert.equal(filterCustomerResponses([response], "cliente uno").length, 1);
  assert.equal(filterCustomerResponses([response], "sin coincidencia").length, 0);
});
