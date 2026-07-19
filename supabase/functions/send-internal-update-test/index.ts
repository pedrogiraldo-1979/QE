import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const AUTHORIZED_USER_ID = "00e1052a-0a42-4110-a8b1-8674a5bafd39";
const AUTHORIZED_USER_EMAIL = "pedro.giraldo@gmail.com";
const TEST_RECIPIENT = "pedro.giraldo@gmail.com";
const FROM_ADDRESS = "ventas@quindioexquisito.com";
const FROM_NAME = "Quindío Exquisito | Ventas";
const FORM_URL = "https://qe-chi.vercel.app/actualizar-datos?token=qe-test-formulario-2026";
const ZEPTOMAIL_URL = "https://zeptomail.zoho.com/v1.1/email";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin =
    origin === "https://qe-chi.vercel.app" ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^http:\/\/localhost:\d+$/i.test(origin)
      ? origin
      : "https://qe-chi.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request),
  });
}

function firstSecret(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método no permitido." }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Sesión requerida." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase runtime variables are unavailable.");
    return jsonResponse(request, { error: "Configuración interna incompleta." }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (
    authError ||
    !user ||
    user.id !== AUTHORIZED_USER_ID ||
    user.email?.toLowerCase() !== AUTHORIZED_USER_EMAIL
  ) {
    return jsonResponse(request, { error: "Usuario no autorizado para esta prueba." }, 403);
  }

  let body: { confirm?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Solicitud inválida." }, 400);
  }

  if (body.confirm !== "SEND_INTERNAL_TEST") {
    return jsonResponse(request, { error: "Confirmación explícita requerida." }, 400);
  }

  const rawToken = firstSecret([
    "ZEPTOMAIL_SEND_TOKEN",
    "ZEPTOMAIL_SEND_MAIL_TOKEN",
    "ZEPTOMAIL_API_TOKEN",
    "ZEPTOMAIL_TOKEN",
    "ZEPTOMAIL_API_KEY",
  ]);

  if (!rawToken) {
    console.error("No supported ZeptoMail token secret was found.");
    return jsonResponse(
      request,
      {
        error:
          "No se encontró el secreto de ZeptoMail. Usa ZEPTOMAIL_SEND_TOKEN, ZEPTOMAIL_SEND_MAIL_TOKEN, ZEPTOMAIL_API_TOKEN, ZEPTOMAIL_TOKEN o ZEPTOMAIL_API_KEY.",
      },
      500,
    );
  }

  const zeptoAuthorization = rawToken.startsWith("Zoho-enczapikey ")
    ? rawToken
    : `Zoho-enczapikey ${rawToken}`;

  const htmlBody = `
    <div style="background:#f7f4ee;padding:24px;font-family:Arial,sans-serif;color:#243126">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d8d2c7;border-radius:18px;padding:28px">
        <p style="margin:0 0 8px;color:#1f6b3a;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">Quindío Exquisito</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">Prueba interna de actualización de datos</h1>
        <p style="margin:0 0 14px;line-height:1.6">Hola Pedro,</p>
        <p style="margin:0 0 14px;line-height:1.6">Estamos realizando una prueba interna del nuevo proceso de actualización de datos de clientes de Quindío Exquisito.</p>
        <p style="margin:0 0 22px;line-height:1.6">Abre el enlace y confirma que el formulario carga correctamente y permite completar la información.</p>
        <p style="margin:0 0 24px">
          <a href="${FORM_URL}" style="display:inline-block;background:#1f6b3a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">Abrir formulario de prueba</a>
        </p>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#687368">Esta es únicamente una prueba interna. No corresponde a información de un cliente real.</p>
        <p style="margin:0;line-height:1.6">Equipo Comercial<br>Quindío Exquisito<br><a href="mailto:${FROM_ADDRESS}" style="color:#1f6b3a">${FROM_ADDRESS}</a></p>
      </div>
    </div>
  `;

  const zeptoResponse = await fetch(ZEPTOMAIL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: zeptoAuthorization,
    },
    body: JSON.stringify({
      from: { address: FROM_ADDRESS, name: FROM_NAME },
      to: [{ email_address: { address: TEST_RECIPIENT, name: "Pedro Giraldo" } }],
      subject: "[PRUEBA INTERNA] Actualización de datos – Quindío Exquisito",
      htmlbody: htmlBody,
    }),
  });

  const providerBody = await zeptoResponse.text();
  if (!zeptoResponse.ok) {
    console.error("ZeptoMail rejected the internal test email", {
      status: zeptoResponse.status,
      response: providerBody.slice(0, 1000),
    });
    return jsonResponse(
      request,
      { error: "ZeptoMail rechazó el envío de prueba.", provider_status: zeptoResponse.status },
      502,
    );
  }

  console.log("Internal ZeptoMail test accepted", {
    recipient: TEST_RECIPIENT,
    sender: FROM_ADDRESS,
    user_id: user.id,
  });

  return jsonResponse(request, {
    ok: true,
    message: `Prueba enviada a ${TEST_RECIPIENT}.`,
    recipient: TEST_RECIPIENT,
  });
});
