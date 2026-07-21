import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "QE_TEST_SUPABASE_URL",
  "QE_TEST_SUPABASE_PUBLISHABLE_KEY",
  "QE_TEST_SUPABASE_PROJECT_REF",
  "QE_TEST_CONFIRM_DISPOSABLE_PROJECT",
  "QE_TEST_ADMIN_EMAIL",
  "QE_TEST_ADMIN_PASSWORD",
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Falta ${name}. El E2E de campaña sólo se ejecuta en un Supabase aislado.`);
  }
}

const url = process.env.QE_TEST_SUPABASE_URL;
const key = process.env.QE_TEST_SUPABASE_PUBLISHABLE_KEY;
const projectRef = process.env.QE_TEST_SUPABASE_PROJECT_REF;
const confirmedProjectRef = process.env.QE_TEST_CONFIRM_DISPOSABLE_PROJECT;
const urlProjectRef = new URL(url).hostname.split(".")[0];
const productionProjectRef = "izbfawwmbilmsrdjaanw";

if (projectRef !== confirmedProjectRef || projectRef !== urlProjectRef) {
  throw new Error("El project_ref no coincide con la URL y la confirmación del entorno desechable.");
}

if (projectRef === productionProjectRef) {
  throw new Error("El E2E de campaña no puede ejecutarse contra el proyecto productivo.");
}

function client() {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function assertNoError(result) {
  assert.ifError(result.error);
  return result.data;
}

test("campaña interna: token, formulario, respuesta y aprobación", async (t) => {
  const anon = client();
  const admin = client();
  const suffix = randomUUID();
  const companyId = randomUUID();
  const token = `campaign-e2e-${suffix}`;
  const originalLegalName = `QE E2E ${suffix} SAS`;
  const updatedLegalName = `QE E2E aprobada ${suffix} SAS`;
  let responseId = null;

  const signIn = await admin.auth.signInWithPassword({
    email: process.env.QE_TEST_ADMIN_EMAIL,
    password: process.env.QE_TEST_ADMIN_PASSWORD,
  });
  assert.ifError(signIn.error);
  assert.ok(signIn.data.session?.access_token);

  try {
    await t.test("crea un fixture sintético sin destinatario real", async () => {
      assert.equal(assertNoError(await admin.rpc("is_crm_authorized")), true);
      assertNoError(await admin.from("companies").insert({
        id: companyId,
        name: `Empresa campaña E2E ${suffix}`,
        legal_name: originalLegalName,
        nit: `QE-E2E-${suffix}`,
        segment: "pruebas",
        status: "nuevo",
        notes: "Fixture temporal de campaña E2E",
      }));
      assertNoError(await admin.from("contacts").insert({
        company_id: companyId,
        company_name: `Empresa campaña E2E ${suffix}`,
        full_name: "Contacto sintético E2E",
        email: "campaign-e2e@example.invalid",
      }));
      assertNoError(await admin.from("cu_links").insert({
        company_id: companyId,
        token,
        email_to: "campaign-e2e@example.invalid",
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }));
    });

    await t.test("el enlace precarga solamente la empresa sintética", async () => {
      const form = assertNoError(await anon.rpc("get_cu_form", { p_token: token }));
      assert.equal(form.cliente_id, companyId);
      assert.equal(form.razon_social, originalLegalName);
      assert.equal(form.correo_actual, "campaign-e2e@example.invalid");

      const missing = assertNoError(await anon.rpc("get_cu_form", {
        p_token: `missing-${suffix}`,
      }));
      assert.equal(missing, null);
    });

    await t.test("el formulario crea una respuesta pendiente trazable", async () => {
      const payload = {
        razon_social_nueva: updatedLegalName,
        contacto_comercial_nuevo: "Contacto actualizado E2E",
        cargo_contacto_nuevo: "Jefe de compras",
        celular_comercial_nuevo: "3001234567",
        telefono_fijo_comercial_nuevo: "6015550101",
        correo_comercial_nuevo: "updated-e2e@example.invalid",
        segundo_contacto_nombre: "Contacto secundario E2E",
        segundo_contacto_cargo: "Coordinadora de cocina",
        segundo_contacto_area: "Cocina",
        segundo_contacto_celular: "3007654321",
        segundo_contacto_telefono_fijo: "6015550202",
        segundo_contacto_correo: "secondary-e2e@example.invalid",
        observaciones_cliente: `campaign-e2e:${suffix}`,
        confirm_no_changes: false,
      };
      responseId = assertNoError(await anon.rpc("submit_cu_form", {
        p_token: token,
        p_payload: payload,
      }));
      assert.ok(responseId);

      const response = assertNoError(await admin
        .from("cu_responses")
        .select("id, company_id, token, status, payload")
        .eq("id", responseId)
        .single());
      assert.equal(response.company_id, companyId);
      assert.equal(response.token, token);
      assert.equal(response.status, "pendiente");
      assert.equal(response.payload.observaciones_cliente, `campaign-e2e:${suffix}`);
    });

    await t.test("la aprobación aplica el cambio y cierra la respuesta", async () => {
      assertNoError(await admin.rpc("approve_cu_response", { p_response_id: responseId }));

      const response = assertNoError(await admin
        .from("cu_responses")
        .select("status")
        .eq("id", responseId)
        .single());
      assert.equal(response.status, "aprobado");

      const company = assertNoError(await admin
        .from("companies")
        .select("legal_name")
        .eq("id", companyId)
        .single());
      assert.equal(company.legal_name, updatedLegalName);

      const contacts = assertNoError(await admin
        .from("contacts")
        .select("full_name, role, email, phone, mobile_phone, office_phone, contact_type, priority, is_primary, source")
        .eq("company_id", companyId)
        .order("priority", { ascending: true }));
      assert.equal(contacts.length, 2);
      assert.deepEqual(contacts[0], {
        full_name: "Contacto actualizado E2E",
        role: "Jefe de compras",
        email: "updated-e2e@example.invalid",
        phone: "3001234567",
        mobile_phone: "3001234567",
        office_phone: "6015550101",
        contact_type: "comercial_principal",
        priority: 1,
        is_primary: true,
        source: "formulario_cliente",
      });
      assert.deepEqual(contacts[1], {
        full_name: "Contacto secundario E2E",
        role: "Coordinadora de cocina",
        email: "secondary-e2e@example.invalid",
        phone: "3007654321",
        mobile_phone: "3007654321",
        office_phone: "6015550202",
        contact_type: "chef",
        priority: 2,
        is_primary: false,
        source: "formulario_cliente",
      });

      assertNoError(await admin.rpc("approve_cu_response", { p_response_id: responseId }));
      const contactsAfterRetry = assertNoError(await admin
        .from("contacts")
        .select("id")
        .eq("company_id", companyId));
      assert.equal(contactsAfterRetry.length, 2);

      const syncQueue = assertNoError(await admin.rpc("get_cu_master_sync_queue"));
      const queued = syncQueue.find((item) => item.response_id === responseId);
      assert.equal(queued?.cliente, `Empresa campaña E2E ${suffix}`);
      assert.equal(queued?.secondary_contacts?.length, 1);

      assertNoError(await admin.rpc("complete_cu_master_sync", {
        p_response_id: responseId,
        p_notes: "Maestros sintéticos verificados",
      }));
      const completed = assertNoError(await admin
        .from("cu_responses")
        .select("master_sync_status, master_synced_at, master_sync_notes")
        .eq("id", responseId)
        .single());
      assert.equal(completed.master_sync_status, "sincronizado");
      assert.ok(completed.master_synced_at);
      assert.equal(completed.master_sync_notes, "Maestros sintéticos verificados");
    });
  } finally {
    await admin.from("companies").delete().eq("id", companyId);
    await admin.auth.signOut();
  }
});
