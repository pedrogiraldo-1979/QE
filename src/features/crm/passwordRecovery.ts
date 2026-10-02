export const RECOVERY_REQUEST_CONFIRMATION =
  "Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.";

export function recoveryRedirectUrl(origin: string): string {
  return new URL("/restablecer-clave", origin).toString();
}

export function validateRecoveryPassword(password: string, confirmation: string): string | null {
  if (!password || !confirmation) return "Completa ambos campos.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  if (password.length < 8) return "Usa al menos 8 caracteres.";
  return null;
}

export function isPasswordRecoveryUrl(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "recovery" && Boolean(params.get("access_token")) &&
    Boolean(params.get("refresh_token")) && !params.has("error");
}
