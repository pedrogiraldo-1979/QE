"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useCrmSession } from "@/hooks/useCrmSession";

const AUTHORIZED_EMAIL = "pedro.giraldo@gmail.com";
const EXPECTED_COUNT = 23;
const CONFIRMATION_TEXT = "ENVIAR LOTE 23";

type Recipient = {
  id: string;
  sequence: number;
  companyName: string;
  recipientName: string;
  recipientEmail: string;
  formUrl: string;
  status: "approved" | "sending" | "sent" | "failed";
  sentAt: string | null;
  providerStatus: number | null;
};

export default function CampaignBatchPage() {
  const { supabase, sessionReady, isAuthenticated, signIn } = useCrmSession();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const loadPreview = useCallback(async (preserveResult = false) => {
    setLoading(true);
    if (!preserveResult) setResult(null);
    const { data, error } = await supabase.functions.invoke("send-approved-campaign-pilot", {
      body: { action: "preview" },
    });
    if (error) {
      setResult({ ok: false, text: error.message || "No se pudo cargar el lote." });
      setLoading(false);
      return;
    }
    const response = data as { ok?: boolean; recipients?: Recipient[]; error?: string } | null;
    if (!response?.ok || !response.recipients) {
      setResult({ ok: false, text: response?.error || "La lista aprobada no está disponible." });
      setLoading(false);
      return;
    }
    setRecipients(response.recipients);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (sessionReady && isAuthenticated) void loadPreview();
  }, [isAuthenticated, loadPreview, sessionReady]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError("");
    const error = await signIn(AUTHORIZED_EMAIL, password);
    if (error) setLoginError(error.message);
    setSigningIn(false);
  }

  const canSend = useMemo(() =>
    recipients.length === EXPECTED_COUNT &&
    recipients.every((recipient) => recipient.status === "approved") &&
    confirmed &&
    confirmationText.trim() === CONFIRMATION_TEXT &&
    !sending,
  [confirmationText, confirmed, recipients, sending]);

  async function sendBatch() {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("send-approved-campaign-pilot", {
      body: { action: "send", confirm: "SEND_APPROVED_BATCH" },
    });
    if (error) {
      setResult({ ok: false, text: "El envío no confirmó un resultado completo. Revisa los estados antes de intentar otra acción." });
      setSending(false);
      await loadPreview(true);
      return;
    }
    const response = data as { ok?: boolean; message?: string; error?: string } | null;
    setResult({ ok: Boolean(response?.ok), text: response?.message || response?.error || "ZeptoMail no confirmó el lote." });
    setSending(false);
    await loadPreview(true);
  }

  if (!sessionReady) return <Centered title="Validando sesión" description="Estamos comprobando que tu usuario esté autorizado." />;

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-[#243126]">
        <section className="w-full max-w-md rounded-[1.75rem] border border-[#d8d2c7] bg-white p-8 shadow-sm">
          <p className="text-center text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
          <h1 className="mt-3 text-center text-3xl font-black">Acceso al envío</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <label className="block text-sm font-black">Correo<input className="mt-2 w-full rounded-xl border border-[#d8d2c7] bg-[#f4f7f2] px-4 py-3" value={AUTHORIZED_EMAIL} readOnly /></label>
            <label className="block text-sm font-black">Contraseña<input className="mt-2 w-full rounded-xl border border-[#d8d2c7] px-4 py-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {loginError ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{loginError}</p> : null}
            <button className="w-full rounded-xl bg-[#1f6b3a] px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={signingIn}>{signingIn ? "Validando…" : "Entrar"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-8 text-[#243126]">
      <section className="mx-auto max-w-5xl rounded-[1.75rem] border border-[#d8d2c7] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-2 text-3xl font-black">Lote aprobado de actualización de datos</h1>
        <p className="mt-3 text-sm leading-6 text-[#687368]">Vista previa cerrada para 23 correos. Los cinco destinatarios del piloto anterior permanecen separados y no pueden reenviarse.</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8d2c7]">
          <div className="grid grid-cols-[48px_1fr_auto] gap-3 bg-[#f4f1ea] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#687368]"><span>#</span><span>Destinatario</span><span>Estado</span></div>
          {loading ? <p className="p-5 text-sm text-[#687368]">Cargando lista aprobada…</p> : null}
          {recipients.map((recipient) => (
            <article className="grid grid-cols-[48px_1fr_auto] gap-3 border-t border-[#e7e1d7] px-4 py-4 text-sm" key={recipient.id}>
              <strong>{recipient.sequence}</strong>
              <div className="min-w-0">
                <p className="font-black">{recipient.companyName}</p>
                <p className="mt-1 text-[#687368]">{recipient.recipientName}</p>
                <p className="break-all text-[#687368]">{recipient.recipientEmail}</p>
                <a className="mt-2 inline-block font-bold text-[#1f6b3a] underline" href={recipient.formUrl} target="_blank" rel="noreferrer">Revisar formulario</a>
              </div>
              <span className="h-fit rounded-full bg-[#f4f7f2] px-3 py-1 text-xs font-bold">{recipient.status}</span>
            </article>
          ))}
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">Confirmación de envío real</h2>
          <label className="flex gap-3 text-sm font-bold text-amber-950"><input className="mt-0.5 h-5 w-5" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Confirmo que revisé los 23 destinatarios y autorizo este lote.</label>
          <label className="block text-sm font-black text-amber-950">Escribe {CONFIRMATION_TEXT}<input className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-4 py-3" value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} /></label>
        </div>

        {result ? <p className={`mt-5 rounded-2xl p-4 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{result.text}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link className="rounded-xl px-4 py-3 text-center text-sm font-bold text-[#1f6b3a]" href="/">Volver al CRM</Link>
          <button className="rounded-xl bg-[#1f6b3a] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="button" disabled={!canSend} onClick={() => void sendBatch()}>{sending ? "Enviando lote…" : "Enviar 23 correos reales"}</button>
        </div>
      </section>
    </main>
  );
}

function Centered({ title, description }: { title: string; description: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4"><section className="max-w-md rounded-3xl bg-white p-8 text-center"><h1 className="text-3xl font-black">{title}</h1><p className="mt-3 text-sm">{description}</p></section></main>;
}
