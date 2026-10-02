"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { RECOVERY_REQUEST_CONFIRMATION, recoveryRedirectUrl } from "@/features/crm/passwordRecovery";
import { getSupabaseClient } from "@/lib/supabase";

export default function RequestPasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const result = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryRedirectUrl(window.location.origin),
      });
      if (result.error) {
        setError(true);
      } else {
        setEmail("");
        setSent(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>Recuperar contraseña</h1>
        <p>Escribe el correo de tu cuenta del CRM.</p>
        {sent ? (
          <p role="status" aria-live="polite">{RECOVERY_REQUEST_CONFIRMATION}</p>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label">
              Correo electrónico
              <input className="input" type="email" autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)} required />
            </label>
            {error ? <p role="alert" className="alert alert-danger">No se pudo enviar la solicitud. Intenta de nuevo más tarde.</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}
        <Link href="/">Volver al acceso</Link>
      </section>
    </main>
  );
}
