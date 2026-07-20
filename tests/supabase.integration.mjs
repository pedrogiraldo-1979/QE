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
  "QE_TEST_OUTSIDER_EMAIL",
  "QE_TEST_OUTSIDER_PASSWORD",
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Falta ${name}. Esta suite sólo puede ejecutarse contra un Supabase aislado.`);
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
  throw new Error("La suite de integración no puede ejecutarse contra el proyecto productivo.");
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

async function signIn(email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return supabase;
}

function assertNoError(result) {
  assert.ifError(result.error);
  return result.data;
}

test("flujos críticos contra Supabase aislado", async (t) => {
  const anon = client();
  const admin = await signIn(process.env.QE_TEST_ADMIN_EMAIL, process.env.QE_TEST_ADMIN_PASSWORD);
  const outsider = await signIn(process.env.QE_TEST_OUTSIDER_EMAIL, process.env.QE_TEST_OUTSIDER_PASSWORD);
  const suffix = randomUUID();
  const ids = {
    company: randomUUID(),
    contact: randomUUID(),
    list: randomUUID(),
    convertProspect: randomUUID(),
    deleteProspect: randomUUID(),
    prospectContact: randomUUID(),
    prospectActivity: randomUUID(),
  };
  const token = `phase6-${suffix}`;
  let convertedCompanyId = null;

  try {
    await t.test("anon no puede leer tablas directamente", async () => {
      const result = await anon.from("companies").select("id").limit(1);
      assert.ok(result.error);
      assert.equal(result.error.code, "42501");
    });

    await t.test("una sesión fuera de la allowlist no ve filas", async () => {
      const authorization = await outsider.rpc("is_crm_authorized");
      assert.equal(assertNoError(authorization), false);

      const result = await outsider.from("companies").select("id");
      assert.deepEqual(assertNoError(result), []);
    });

    await t.test("admin autorizado crea el fixture de ejecución", async () => {
      assert.equal(assertNoError(await admin.rpc("is_crm_authorized")), true);

      assertNoError(await admin.from("companies").insert({
        id: ids.company,
        name: `Empresa integración ${suffix}`,
        legal_name: `Empresa integración ${suffix} SAS`,
        nit: `QE-${suffix}`,
        segment: "pruebas",
        status: "nuevo",
        notes: "Fixture temporal de integración",
      }));
      assertNoError(await admin.from("contacts").insert({
        id: ids.contact,
        company_id: ids.company,
        company_name: `Empresa integración ${suffix}`,
        full_name: "Contacto integración",
        email: "integracion@example.invalid",
      }));
      assertNoError(await admin.from("cu_links").insert({
        company_id: ids.company,
        token,
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }));
      assertNoError(await admin.from("prospect_lists").insert({
        id: ids.list,
        name: `Lista integración ${suffix}`,
        source: "integration-test",
      }));
      assertNoError(await admin.from("prospects").insert([
        {
          id: ids.convertProspect,
          list_id: ids.list,
          company_name: `Prospecto convertir ${suffix}`,
          nit: `QE-C-${suffix}`,
          status: "por_revisar",
        },
        {
          id: ids.deleteProspect,
          list_id: ids.list,
          company_name: `Prospecto eliminar ${suffix}`,
          nit: `QE-D-${suffix}`,
          status: "por_revisar",
        },
      ]));
      assertNoError(await admin.from("prospect_contacts").insert({
        id: ids.prospectContact,
        prospect_id: ids.deleteProspect,
        full_name: "Contacto prospecto integración",
      }));
      assertNoError(await admin.from("prospect_activities").insert({
        id: ids.prospectActivity,
        prospect_id: ids.deleteProspect,
        contact_id: ids.prospectContact,
        activity_type: "follow_up",
      }));
    });

    await t.test("formulario público respeta token y límites", async () => {
      const form = assertNoError(await anon.rpc("get_cu_form", { p_token: token }));
      assert.equal(form.cliente_id, ids.company);

      const invalid = await anon.rpc("submit_cu_form", {
        p_token: token,
        p_payload: ["no-es-un-objeto"],
      });
      assert.equal(invalid.error?.code, "22023");

      const oversized = await anon.rpc("submit_cu_form", {
        p_token: token,
        p_payload: { notes: "x".repeat(33_000) },
      });
      assert.equal(oversized.error?.code, "22001");
    });

    await t.test("rechazo y aprobación son transiciones terminales", async () => {
      const originalLegalName = `Empresa integración ${suffix} SAS`;
      const rejectedName = `No debe aplicarse ${suffix}`;
      const rejectedResponseId = assertNoError(await anon.rpc("submit_cu_form", {
        p_token: token,
        p_payload: { razon_social_nueva: rejectedName },
      }));

      assertNoError(await admin.rpc("reject_cu_response", { p_response_id: rejectedResponseId }));
      assertNoError(await admin.rpc("approve_cu_response", { p_response_id: rejectedResponseId }));

      const rejected = assertNoError(await admin
        .from("cu_responses")
        .select("status")
        .eq("id", rejectedResponseId)
        .single());
      assert.equal(rejected.status, "rechazado");

      const unchanged = assertNoError(await admin
        .from("companies")
        .select("legal_name")
        .eq("id", ids.company)
        .single());
      assert.equal(unchanged.legal_name, originalLegalName);

      const approvedName = `Empresa aprobada ${suffix} SAS`;
      const approvedResponseId = assertNoError(await anon.rpc("submit_cu_form", {
        p_token: token,
        p_payload: { razon_social_nueva: approvedName },
      }));

      assertNoError(await admin.rpc("approve_cu_response", { p_response_id: approvedResponseId }));
      assertNoError(await admin.rpc("reject_cu_response", { p_response_id: approvedResponseId }));

      const approved = assertNoError(await admin
        .from("cu_responses")
        .select("status")
        .eq("id", approvedResponseId)
        .single());
      assert.equal(approved.status, "aprobado");

      const changed = assertNoError(await admin
        .from("companies")
        .select("legal_name")
        .eq("id", ids.company)
        .single());
      assert.equal(changed.legal_name, approvedName);
    });

    await t.test("conversión es idempotente", async () => {
      const first = assertNoError(await admin.rpc("convert_prospect_to_company", {
        p_prospect_id: ids.convertProspect,
        p_notes: "Integración Fase 6",
      }));
      const second = assertNoError(await admin.rpc("convert_prospect_to_company", {
        p_prospect_id: ids.convertProspect,
        p_notes: "Reintento integración Fase 6",
      }));

      convertedCompanyId = first.id;
      assert.equal(second.id, first.id);

      const matches = assertNoError(await admin
        .from("companies")
        .select("id")
        .eq("nit", `QE-C-${suffix}`));
      assert.equal(matches.length, 1);
    });

    await t.test("borrado de prospecto es idempotente y en cascada", async () => {
      assert.equal(assertNoError(await admin.rpc("delete_prospect", {
        p_prospect_id: ids.deleteProspect,
      })), true);
      assert.equal(assertNoError(await admin.rpc("delete_prospect", {
        p_prospect_id: ids.deleteProspect,
      })), false);

      const contacts = assertNoError(await admin
        .from("prospect_contacts")
        .select("id")
        .eq("prospect_id", ids.deleteProspect));
      const activities = assertNoError(await admin
        .from("prospect_activities")
        .select("id")
        .eq("prospect_id", ids.deleteProspect));
      assert.deepEqual(contacts, []);
      assert.deepEqual(activities, []);
    });
  } finally {
    await admin.rpc("delete_prospect", { p_prospect_id: ids.convertProspect });
    await admin.from("prospect_lists").delete().eq("id", ids.list);
    await admin.from("companies").delete().eq("id", ids.company);
    if (convertedCompanyId) {
      await admin.from("companies").delete().eq("id", convertedCompanyId);
    }
    await Promise.all([admin.auth.signOut(), outsider.auth.signOut()]);
  }
});
