"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, MailCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";

const AUTHORIZED_EMAIL = "pedro.giraldo@gmail.com";
const CONFIRMATION_TEXT = "ENVIAR PILOTO";

type PilotRecipient = {
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

export default function CampaignPilotPage() {
  const { supabase, sessionReady, isAuthenticated, signIn } = useCrmSession();
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<PilotRecipient[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadPreview = useCallback(async (preserveResult = false) => {
    setLoading(true);
    if (!preserveResult) setResult(null);
    const { data, error } = await supabase.functions.invoke("send-approved-campaign-pilot", {
      body: { action: "preview" },
    });
    if (error) {
      setResult({ tone: "error", text: error.message || "No se pudo cargar el piloto." });
      setLoading(false);
      return;
    }
    const response = data as { ok?: boolean; recipients?: PilotRecipient[]; error?: string } | null;
    if (!response?.ok || !response.recipients) {
      setResult({ tone: "error", text: response?.error || "La lista aprobada no está disponible." });
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
    const error = await signIn(AUTHORIZED_EMAIL, loginPassword);
    if (error) setLoginError(error.message);
    setSigningIn(false);
  }

  const canSend = useMemo(
    () =>
      recipients.length === 5 &&
      recipients.every((recipient) => recipient.status === "approved") &&
      confirmed &&
      confirmationText.trim() === CONFIRMATION_TEXT &&
      !sending,
    [confirmationText, confirmed, recipients, sending],
  );

  async function sendPilot() {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("send-approved-campaign-pilot", {
      body: { action: "send", confirm: "SEND_APPROVED_PILOT" },
    });
    if (error) {
      setResult({
        tone: "error",
        text: "El envío no confirmó un resultado completo. Revisa los estados antes de intentar cualquier acción.",
      });
      setSending(false);
      await loadPreview(true);
      return;
    }
    const response = data as { ok?: boolean; message?: string; error?: string } | null;
    setResult({
      tone: response?.ok ? "success" : "error",
      text: response?.message || response?.error || "ZeptoMail no confirmó el piloto.",
    });
    setSending(false);
    await loadPreview(true);
  }

  if (!sessionReady) {
    return <CenteredState title="Validando sesión" description="Estamos comprobando que tu usuario esté autorizado." />;
  }
  if (!isAuthenticated) {
    return (
      <PilotLogin
        password={loginPassword}
        error={loginError}
        signingIn={signingIn}
        onPasswordChange={setLoginPassword}
        onSubmit={handleSignIn}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-8 text-[#243126]">
      <section className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#d8d2c7] bg-white p-6 shadow-sm sm:p-8">
        <header className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#edf5ea] p-3 text-[#1f6b3a]">
            <MailCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1f6b3a]">Quindío Exquisito</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Piloto de actualización de datos</h1>
            <p className="mt-3 text-sm leading-6 text-[#687368]">
              Vista previa cerrada para cinco correos reales. Ningún destinatario puede editarse desde esta pantalla.
            </p>
          </div>
        </header>

        <div className="mt-6 flex gap-3 rounded-2xl border border-[#d8d2c7] bg-[#f4f7f2] p-4 text-sm leading-6">
          <ShieldCheck className="mt-0.5 shrink-0 text-[#1f6b3a]" size={20} />
          <p>
            Cada envío es individual, usa <strong>ventas@quindioexquisito.com</strong> y queda bloqueado contra repeticiones.
            Si una respuesta es incierta, el sistema se detiene en modo seguro y exige revisión.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8d2c7]">
          <div className="grid grid-cols-[48px_1fr_auto] gap-3 bg-[#f4f1ea] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#687368]">
            <span>#</span><span>Destinatario</span><span>Estado</span>
          </div>
          {loading ? <p className="p-5 text-sm text-[#687368]">Cargando lista aprobada…</p> : null}
          {!loading && recipients.length === 0 ? (
            <p className="p-5 text-sm text-[#687368]">No hay destinatarios provisionados para el piloto.</p>
          ) : null}
          {recipients.map((recipient) => (
            <article
              className="grid grid-cols-[48px_1fr_auto] gap-3 border-t border-[#e7e1d7] px-4 py-4 text-sm"
              key={recipient.id}
            >
              <strong>{recipient.sequence}</strong>
              <div className="min-w-0">
                <p className="font-black">{recipient.companyName}</p>
                <p className="mt-1 text-[#687368]">{recipient.recipientName}</p>
                <p className="break-all text-[#687368]">{recipient.recipientEmail}</p>
                <a
                  className="mt-2 inline-flex items-center gap-1 font-bold text-[#1f6b3a] underline"
                  href={recipient.formUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Revisar formulario <ExternalLink size={14} />
                </a>
              </div>
              <StatusBadge status={recipient.status} />
            </article>
          ))}
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 shrink-0 text-amber-700" size={20} />
            <div>
              <h2 className="font-black text-amber-900">Confirmación de envío real</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Revisa los cinco destinatarios y sus formularios. La acción no puede repetirse desde esta pantalla.
              </p>
            </div>
          </div>
          <label className="flex gap-3 text-sm font-bold text-amber-950">
            <input
              className="mt-0.5 h-5 w-5 accent-[#1f6b3a]"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo que revisé los cinco destinatarios y autorizo el piloto real.
          </label>
          <label className="block text-sm font-black text-amber-950">
            Escribe {CONFIRMATION_TEXT} para habilitar el botón
            <input
              className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 font-medium outline-none focus:border-[#1f6b3a]"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
            />
          </label>
        </div>

        {result ? (
          <div className={`mt-5 flex gap-3 rounded-2xl p-4 text-sm font-bold ${
            result.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}>
            {result.tone === "success" ? <CheckCircle2 className="shrink-0" size={18} /> : <TriangleAlert className="shrink-0" size={18} />}
            <span>{result.text}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link className="rounded-xl px-4 py-3 text-center text-sm font-bold text-[#1f6b3a]" href="/">
            Volver al CRM
          </Link>
          <button
            className="rounded-xl bg-[#1f6b3a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#195a31] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!canSend}
            onClick={() => void sendPilot()}
          >
            {sending ? "Enviando piloto…" : "Enviar 5 correos reales"}
          </button>
        </div>
      </section>
    </main>
  );
}

function PilotLogin({
  password,
  error,
  signingIn,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  error: string;
  signingIn: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-[#243126]">
      <section className="w-full max-w-md rounded-[1.75rem] border border-[#d8d2c7] bg-white p-8 shadow-sm">
        <p className="text-center text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-3 text-center text-3xl font-black">Acceso al piloto</h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#687368]">
          Esta pantalla valida la misma cuenta autorizada del CRM.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-black">
            Correo
            <input className="mt-2 w-full rounded-xl border border-[#d8d2c7] bg-[#f4f7f2] px-4 py-3" value={AUTHORIZED_EMAIL} readOnly />
          </label>
          <label className="block text-sm font-black">
            Contraseña
            <input
              className="mt-2 w-full rounded-xl border border-[#d8d2c7] px-4 py-3 outline-none focus:border-[#1f6b3a]"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          <button className="w-full rounded-xl bg-[#1f6b3a] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit" disabled={signingIn}>
            {signingIn ? "Validando…" : "Entrar al piloto"}
          </button>
        </form>
        <Link className="mt-4 block text-center text-sm font-bold text-[#1f6b3a]" href="/">Volver al CRM</Link>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: PilotRecipient["status"] }) {
  const labels = { approved: "Aprobado", sending: "En proceso", sent: "Enviado", failed: "Revisión" };
  const tones = {
    approved: "bg-blue-50 text-blue-700",
    sending: "bg-amber-50 text-amber-700",
    sent: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
  };
  return <span className={`h-fit rounded-full px-3 py-1 text-xs font-black ${tones[status]}`}>{labels[status]}</span>;
}

function CenteredState({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-[#243126]">
      <section className="max-w-md rounded-[1.75rem] border border-[#d8d2c7] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#687368]">{description}</p>
        <Link className="mt-6 inline-flex rounded-xl bg-[#1f6b3a] px-5 py-3 text-sm font-black text-white" href="/">
          Ir al CRM
        </Link>
      </section>
    </main>
  );
}
