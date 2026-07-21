import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import {
  buildZeptoMailRequest,
  findZeptoMailToken,
  INTERNAL_TEST,
  zeptoAuthorization,
  ZEPTOMAIL_SECRET_NAMES,
} from "./campaign-email.mjs";

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
    user.id !== INTERNAL_TEST.authorizedUserId ||
    user.email?.toLowerCase() !== INTERNAL_TEST.authorizedUserEmail
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

  const rawToken = findZeptoMailToken((name: string) => Deno.env.get(name));

  if (!rawToken) {
    console.error("No supported ZeptoMail token secret was found.");
    return jsonResponse(
      request,
      {
        error:
          `No se encontró el secreto de ZeptoMail. Usa uno de: ${ZEPTOMAIL_SECRET_NAMES.join(", ")}.`,
      },
      500,
    );
  }

  const zeptoResponse = await fetch(ZEPTOMAIL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: zeptoAuthorization(rawToken),
    },
    body: JSON.stringify(buildZeptoMailRequest()),
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
    recipient: INTERNAL_TEST.recipientAddress,
    sender: INTERNAL_TEST.fromAddress,
    user_id: user.id,
  });

  return jsonResponse(request, {
    ok: true,
    message: `Prueba enviada a ${INTERNAL_TEST.recipientAddress}.`,
    recipient: INTERNAL_TEST.recipientAddress,
  });
});
