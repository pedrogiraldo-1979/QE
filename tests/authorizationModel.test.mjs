import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceDataTabForRole,
  getAllowedDataTabs,
  isCrmAdmin,
  parseCrmSessionContext,
} from "../src/features/crm/authorizationModel.ts";

test("interpreta únicamente roles CRM válidos", () => {
  assert.deepEqual(parseCrmSessionContext({ authorized: true, role: "admin" }), { authorized: true, role: "admin" });
  assert.deepEqual(parseCrmSessionContext({ authorized: true, role: "member" }), { authorized: true, role: "member" });
  assert.deepEqual(parseCrmSessionContext({ authorized: false, role: null }), { authorized: false, role: null });
  assert.equal(parseCrmSessionContext({ authorized: true, role: "owner" }), null);
  assert.equal(parseCrmSessionContext(null), null);
});

test("reserva respuestas y conciliación para admin", () => {
  assert.equal(isCrmAdmin("admin"), true);
  assert.equal(isCrmAdmin("member"), false);
  assert.deepEqual(getAllowedDataTabs("admin"), ["pending", "responses", "sync"]);
  assert.deepEqual(getAllowedDataTabs("member"), ["pending"]);
  assert.equal(coerceDataTabForRole("responses", "member"), "pending");
  assert.equal(coerceDataTabForRole("sync", "admin"), "sync");
});
