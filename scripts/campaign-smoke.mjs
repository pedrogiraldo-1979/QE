const appUrl = (process.env.CRM_BASE_URL ?? "https://qe-chi.vercel.app").replace(/\/$/, "");
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const testToken = "qe-test-formulario-2026";

if (!supabaseUrl || !publishableKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

async function expectStatus(label, url, expectedStatus, options) {
  const response = await fetch(url, {
    ...options,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: HTTP ${response.status}; se esperaba ${expectedStatus}`);
  }
  return response;
}

const checks = [
  ["formulario público", `${appUrl}/actualizar-datos?token=${testToken}`],
  ["control interno de correo", `${appUrl}/prueba-correo`],
];

for (const [label, url] of checks) {
  const response = await expectStatus(label, url, 200);
  const html = await response.text();
  if (!/<html[^>]+lang=["']es["']/i.test(html) || !/<body[\s>]/i.test(html)) {
    throw new Error(`${label}: la respuesta no es un documento HTML completo en español.`);
  }
  console.log(`OK ${label}`);
}

const rpcHeaders = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
  "Content-Type": "application/json",
};

const validForm = await expectStatus(
  "RPC con token sintético",
  `${supabaseUrl}/rest/v1/rpc/get_cu_form`,
  200,
  { method: "POST", headers: rpcHeaders, body: JSON.stringify({ p_token: testToken }) },
);
const validPayload = await validForm.json();
if (!validPayload || typeof validPayload !== "object") {
  throw new Error("RPC con token sintético: no devolvió el contrato del formulario.");
}
console.log("OK RPC con token sintético");

const invalidForm = await expectStatus(
  "RPC con token inválido",
  `${supabaseUrl}/rest/v1/rpc/get_cu_form`,
  200,
  {
    method: "POST",
    headers: rpcHeaders,
    body: JSON.stringify({ p_token: "qe-smoke-token-inexistente" }),
  },
);
if (await invalidForm.json() !== null) {
  throw new Error("RPC con token inválido: expuso datos inesperados.");
}
console.log("OK token inválido no expone datos");

await expectStatus(
  "Edge Function sin autenticación",
  `${supabaseUrl}/functions/v1/send-internal-update-test`,
  401,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: "SEND_INTERNAL_TEST" }),
  },
);
console.log("OK Edge Function bloquea llamadas sin autenticación");
console.log("Smoke de campaña aprobado: no se enviaron correos ni se mutaron datos.");
