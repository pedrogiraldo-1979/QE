export const PILOT_CONTROL = Object.freeze({
  authorizedUserId: "00e1052a-0a42-4110-a8b1-8674a5bafd39",
  authorizedUserEmail: "pedro.giraldo@gmail.com",
  fromAddress: "ventas@quindioexquisito.com",
  fromName: "Quindío Exquisito | Ventas",
  subject: "Quindío Exquisito - actualización de datos",
  formBaseUrl: "https://qe-chi.vercel.app/actualizar-datos",
  confirmation: "SEND_APPROVED_BATCH",
  batchKey: "wave-2026-07-23-18",
  recipientCount: 18,
});

export const ZEPTOMAIL_SECRET_NAMES = Object.freeze([
  "ZEPTOMAIL_SEND_TOKEN",
  "ZEPTOMAIL_SEND_MAIL_TOKEN",
  "ZEPTOMAIL_API_TOKEN",
  "ZEPTOMAIL_TOKEN",
  "ZEPTOMAIL_API_KEY",
]);

export function findZeptoMailToken(readSecret) {
  for (const name of ZEPTOMAIL_SECRET_NAMES) {
    const value = readSecret(name)?.trim();
    if (value) return value;
  }
  return "";
}

export function zeptoAuthorization(rawToken) {
  return rawToken.startsWith("Zoho-enczapikey ")
    ? rawToken
    : `Zoho-enczapikey ${rawToken}`;
}

export function buildFormUrl(token) {
  return `${PILOT_CONTROL.formBaseUrl}?token=${encodeURIComponent(token)}`;
}

export function isSingleEmail(value) {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
}

export function validatePilotBatch(recipients, now = new Date()) {
  if (recipients.length !== PILOT_CONTROL.recipientCount) {
    return `El lote requiere exactamente ${PILOT_CONTROL.recipientCount} destinatarios.`;
  }

  const sequences = new Set();
  const emails = new Set();

  for (const recipient of recipients) {
    const email = recipient.recipientEmail.trim().toLowerCase();
    if (!isSingleEmail(email) || email !== recipient.linkEmail?.trim().toLowerCase()) {
      return "Un destinatario no coincide con el correo aprobado del enlace.";
    }
    if (emails.has(email) || sequences.has(recipient.sequence)) {
      return "El lote contiene destinatarios o posiciones duplicadas.";
    }
    if (
      recipient.status !== "approved" ||
      !recipient.isActive ||
      recipient.respondedAt ||
      (recipient.expiresAt && new Date(recipient.expiresAt) <= now)
    ) {
      return "Un destinatario dejó de estar disponible para el lote.";
    }
    emails.add(email);
    sequences.add(recipient.sequence);
  }

  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildPilotHtml(recipient) {
  const formUrl = buildFormUrl(recipient.token);
  return `
    <div style="background:#f7f4ee;padding:24px;font-family:Arial,sans-serif;color:#243126">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d8d2c7;border-radius:18px;padding:28px">
        <p style="margin:0 0 8px;color:#1f6b3a;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">Quindío Exquisito</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">Actualización de datos</h1>
        <p style="margin:0 0 14px;line-height:1.6">Hola ${escapeHtml(recipient.recipientName)},</p>
        <p style="margin:0 0 14px;line-height:1.6">Estamos actualizando nuestra base de datos de clientes de Quindío Exquisito.</p>
        <p style="margin:0 0 22px;line-height:1.6">Por favor revisa la información registrada de ${escapeHtml(recipient.companyName)} y confirma si sigue vigente o actualiza los datos que hayan cambiado.</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(formUrl)}" style="display:inline-block;background:#1f6b3a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">Revisar y actualizar datos</a>
        </p>
        <p style="margin:0;line-height:1.6">Gracias,<br>Equipo Comercial<br>Quindío Exquisito<br><a href="mailto:${PILOT_CONTROL.fromAddress}" style="color:#1f6b3a">${PILOT_CONTROL.fromAddress}</a></p>
      </div>
    </div>
  `;
}

export function buildZeptoMailRequest(recipient) {
  return {
    from: { address: PILOT_CONTROL.fromAddress, name: PILOT_CONTROL.fromName },
    to: [{
      email_address: {
        address: recipient.recipientEmail,
        name: recipient.recipientName,
      },
    }],
    subject: PILOT_CONTROL.subject,
    htmlbody: buildPilotHtml(recipient),
  };
}
