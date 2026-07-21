import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import {
  buildFormUrl,
  buildZeptoMailRequest,
  findZeptoMailToken,
  PILOT_CONTROL,
  validatePilotBatch,
  zeptoAuthorization,
} from "./pilot-email.mjs";

const ZEPTOMAIL_URL = "https://zeptomail.zoho.com/v1.1/email";

type PilotRow = {
  id: string;
  sequence: number;
  recipient_name: string;
  recipient_email: string;
  status: "approved" | "sending" | "sent" | "failed";
  claimed_at: string | null;
  sent_at: string | null;
  provider_status: number | null;
  cu_links: {
    token: string;
    email_to: string | null;
    is_active: boolean;
    expires_at: string | null;
    responded_at: string | null;
    companies: { name: string };
  };
};

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
  return new Response(JSON.stringify(body), { status, headers: getCorsHeaders(request) });
}

function keyFromJsonMap(name: string) {
  const value = Deno.env.get(name);
  if (!value) return "";
  try {
    const keys = JSON.parse(value) as Record<string, string>;
    return keys.default || "";
  } catch {
    return "";
  }
}

function toRecipient(row: PilotRow) {
  return {
    id: row.id,
    sequence: row.sequence,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    status: row.status,
    token: row.cu_links.token,
    linkEmail: row.cu_links.email_to,
    isActive: row.cu_links.is_active,
    expiresAt: row.cu_links.expires_at,
    respondedAt: row.cu_links.responded_at,
    companyName: row.cu_links.companies.name,
    claimedAt: row.claimed_at,
    sentAt: row.sent_at,
    providerStatus: row.provider_status,
  };
}

async function loadPilot(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("campaign_pilot_recipients")
    .select(`
      id, sequence, recipient_name, recipient_email, status,
      claimed_at, sent_at, provider_status,
      cu_links!inner(
        token, email_to, is_active, expires_at, responded_at,
        companies!inner(name)
      )
    `)
    .order("sequence");

  if (error) throw new Error("No se pudo cargar la lista aprobada.");
  return (data as unknown as PilotRow[]).map(toRecipient);
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
  const publicKey = keyFromJsonMap("SUPABASE_PUBLISHABLE_KEYS") || Deno.env.get("SUPABASE_ANON_KEY");
  const adminKey = keyFromJsonMap("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publicKey || !adminKey) {
    console.error("Campaign pilot runtime variables are unavailable.");
    return jsonResponse(request, { error: "Configuración interna incompleta." }, 500);
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData.user;
  if (
    authError || !user ||
    user.id !== PILOT_CONTROL.authorizedUserId ||
    user.email?.toLowerCase() !== PILOT_CONTROL.authorizedUserEmail
  ) {
    return jsonResponse(request, { error: "Usuario no autorizado para este piloto." }, 403);
  }

  let body: { action?: string; confirm?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Solicitud inválida." }, 400);
  }

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const recipients = await loadPilot(admin);
    if (body.action === "preview") {
      return jsonResponse(request, {
        ok: true,
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          sequence: recipient.sequence,
          companyName: recipient.companyName,
          recipientName: recipient.recipientName,
          recipientEmail: recipient.recipientEmail,
          formUrl: buildFormUrl(recipient.token),
          status: recipient.status,
          sentAt: recipient.sentAt,
          providerStatus: recipient.providerStatus,
        })),
      });
    }

    if (body.action !== "send" || body.confirm !== PILOT_CONTROL.confirmation) {
      return jsonResponse(request, { error: "Confirmación explícita requerida." }, 400);
    }

    const validationError = validatePilotBatch(recipients);
    if (validationError) {
      return jsonResponse(request, { error: validationError }, 409);
    }

    const rawToken = findZeptoMailToken((name: string) => Deno.env.get(name));
    if (!rawToken) {
      console.error("No supported ZeptoMail token secret was found for campaign pilot.");
      return jsonResponse(request, { error: "No se encontró el secreto de ZeptoMail." }, 500);
    }

    const { error: claimError } = await admin.rpc("claim_campaign_pilot_batch", {
      p_sent_by: user.id,
    });
    if (claimError) {
      return jsonResponse(request, { error: "El piloto ya fue reclamado o dejó de ser válido." }, 409);
    }

    const claimedRecipients = await loadPilot(admin);
    const outcomes: Array<{ id: string; status: "sent" | "failed"; providerStatus: number }> = [];

    for (const recipient of claimedRecipients) {
      let providerStatus = 0;
      let status: "sent" | "failed" = "failed";
      try {
        const providerResponse = await fetch(ZEPTOMAIL_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: zeptoAuthorization(rawToken),
          },
          body: JSON.stringify(buildZeptoMailRequest(recipient)),
        });
        providerStatus = providerResponse.status;
        await providerResponse.text();
        status = providerResponse.ok ? "sent" : "failed";
      } catch {
        providerStatus = 0;
      }

      const { error: updateError } = await admin
        .from("campaign_pilot_recipients")
        .update({
          status,
          provider_status: providerStatus,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipient.id)
        .eq("status", "sending");

      if (updateError) {
        console.error("Campaign pilot status update failed.");
      }
      outcomes.push({ id: recipient.id, status, providerStatus });
    }

    const sent = outcomes.filter((outcome) => outcome.status === "sent").length;
    console.log("Campaign pilot completed", { total: outcomes.length, sent, failed: outcomes.length - sent });

    return jsonResponse(request, {
      ok: sent === outcomes.length,
      message: `${sent}/${outcomes.length} correos fueron aceptados por ZeptoMail.`,
      outcomes,
    }, sent === outcomes.length ? 200 : 502);
  } catch {
    console.error("Campaign pilot operation failed.");
    return jsonResponse(request, { error: "No se pudo completar la operación del piloto." }, 500);
  }
});
