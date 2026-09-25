"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { validateRecoveryPassword } from "@/features/crm/passwordRecovery";
import { getSupabaseClient } from "@/lib/supabase";

type Phase = "checking" | "ready" | "invalid" | "verification-error" | "saving" | "done";

export default function SetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const verificationId = useRef(0);

  const verify = useCallback(async () => {
    const currentId = ++verificationId.current;
    setPhase("checking");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (verificationId.current !== currentId) return;
      if (error || !data.session) {
        setPhase("invalid");
        return;
      }
      const access = await supabase.rpc("is_crm_authorized");
      if (verificationId.current !== currentId) return;
      if (access.error) {
        setPhase("verification-error");
        return;
      }
      if (access.data !== true) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // The recovery form stays unavailable even if session cleanup fails.
        }
        if (verificationId.current === currentId) setPhase("invalid");
        return;
      }
      setPhase("ready");
    } catch {
      if (verificationId.current === currentId) setPhase("verification-error");
    }
  }, []);

  useEffect(() => {
    void verify();
    return () => { verificationId.current += 1; };
  }, [verify]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "ready") return;
    const validation = validateRecoveryPassword(password, confirmation);
    if (validation) {
      setMessage(validation);
      return;
    }
    setPhase("saving");
    setMessage("");
    try {
      const supabase = getSupabaseClient();
      const updated = await supabase.auth.updateUser({ password });
      setPassword("");
      setConfirmation("");
      if (updated.error) {
        setMessage("No se pudo cambiar la contraseña. Revisa los requisitos e intenta de nuevo.");
        setPhase("ready");
        return;
      }
      let signedOut = false;
      try {
        signedOut = !(await supabase.auth.signOut({ scope: "local" })).error;
      } catch {
        signedOut = false;
      }
      setMessage(signedOut
        ? "Contraseña cambiada. Ya puedes iniciar sesión."
        : "Contraseña cambiada. Cierra esta ventana antes de volver a entrar.");
      setPhase("done");
    } catch {
      setPassword("");
      setConfirmation("");
      setMessage("No se pudo completar el cambio. Intenta de nuevo.");
      setPhase("ready");
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>Restablecer contraseña</h1>
        {phase === "checking" ? <p role="status">Validando enlace...</p> : null}
        {phase === "invalid" ? <p role="alert">Enlace no disponible o vencido.</p> : null}
        {phase === "verification-error" ? (
          <div role="alert">
            <p>No se pudo verificar el acceso. Intenta de nuevo.</p>
            <button className="btn" type="button" onClick={() => void verify()}>Reintentar</button>
          </div>
        ) : null}
        {(phase === "ready" || phase === "saving") ? (
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label">Nueva contraseña
              <input className="input" type="password" autoComplete="new-password" value={password}
                onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="field-label">Confirmar contraseña
              <input className="input" type="password" autoComplete="new-password" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)} required />
            </label>
            {message ? <p role="alert" className="alert alert-danger">{message}</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={phase === "saving"}>
              {phase === "saving" ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        ) : null}
        {phase === "done" ? <p role="status" aria-live="polite">{message}</p> : null}
        {phase === "invalid" ? <Link href="/recuperar-clave">Solicitar otro enlace</Link> : null}
        {phase === "done" ? <Link href="/">Volver al acceso</Link> : null}
      </section>
    </main>
  );
}
