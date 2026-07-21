export const INTERNAL_TEST = Object.freeze({
  authorizedUserId: "00e1052a-0a42-4110-a8b1-8674a5bafd39",
  authorizedUserEmail: "pedro.giraldo@gmail.com",
  recipientAddress: "pedro.giraldo@gmail.com",
  recipientName: "Pedro Giraldo",
  fromAddress: "ventas@quindioexquisito.com",
  fromName: "Quindío Exquisito | Ventas",
  formUrl: "https://qe-chi.vercel.app/actualizar-datos?token=qe-test-formulario-2026",
  subject: "[PRUEBA INTERNA] Actualización de datos – Quindío Exquisito",
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

export function buildInternalTestHtml() {
  return `
    <div style="background:#f7f4ee;padding:24px;font-family:Arial,sans-serif;color:#243126">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #d8d2c7;border-radius:18px;padding:28px">
        <p style="margin:0 0 8px;color:#1f6b3a;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">Quindío Exquisito</p>
        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">Prueba interna de actualización de datos</h1>
        <p style="margin:0 0 14px;line-height:1.6">Hola Pedro,</p>
        <p style="margin:0 0 14px;line-height:1.6">Estamos realizando una prueba interna del nuevo proceso de actualización de datos de clientes de Quindío Exquisito.</p>
        <p style="margin:0 0 22px;line-height:1.6">Abre el enlace y confirma que el formulario carga correctamente y permite completar la información.</p>
        <p style="margin:0 0 24px">
          <a href="${INTERNAL_TEST.formUrl}" style="display:inline-block;background:#1f6b3a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">Abrir formulario de prueba</a>
        </p>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#687368">Esta es únicamente una prueba interna. No corresponde a información de un cliente real.</p>
        <p style="margin:0;line-height:1.6">Equipo Comercial<br>Quindío Exquisito<br><a href="mailto:${INTERNAL_TEST.fromAddress}" style="color:#1f6b3a">${INTERNAL_TEST.fromAddress}</a></p>
      </div>
    </div>
  `;
}

export function buildZeptoMailRequest() {
  return {
    from: { address: INTERNAL_TEST.fromAddress, name: INTERNAL_TEST.fromName },
    to: [{
      email_address: {
        address: INTERNAL_TEST.recipientAddress,
        name: INTERNAL_TEST.recipientName,
      },
    }],
    subject: INTERNAL_TEST.subject,
    htmlbody: buildInternalTestHtml(),
  };
}
