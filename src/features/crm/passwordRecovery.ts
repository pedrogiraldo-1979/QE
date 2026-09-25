export const RECOVERY_REQUEST_CONFIRMATION =
  "Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.";

export function recoveryRedirectUrl(origin: string): string {
  return new URL("/restablecer-clave", origin).toString();
}

export function validateRecoveryPassword(password: string, confirmation: string): string | null {
  if (!password || !confirmation) return "Completa ambos campos.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
