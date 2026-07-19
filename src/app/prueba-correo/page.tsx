"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

const TEST_RECIPIENT = "pedro.giraldo@gmail.com";
const TEST_FORM_URL = "https://qe-chi.vercel.app/actualizar-datos?token=qe-test-formulario-2026";

export default function EmailTestPage() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthorized(data.user?.email?.toLowerCase() === TEST_RECIPIENT);
      setSessionReady(true);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  async function sendInternalTest() {
    if (!confirmed || sending) return;

    setSending(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("send-internal-update-test", {
      body: { confirm: "SEND_INTERNAL_TEST" },
    });

    if (error) {
      setResult({ tone: "error", text: error.message || "No se pudo enviar la prueba." });
      setSending(false);
      return;
    }

    const response = data as { ok?: boolean; message?: string; error?: string } | null;
    if (!response?.ok) {
      setResult({ tone: "error", text: response?.error || "ZeptoMail no confirmó el envío." });
      setSending(false);
      return;
    }

    setResult({ tone: "success", text: response.message || `Prueba enviada a ${TEST_RECIPIENT}.` });
    setSending(false);
  }

  if (!sessionReady) {
    return <CenteredState title="Validando sesión" description="Estamos comprobando que tu usuario esté autorizado." />;
  }

  if (!authorized) {
    return (
      <CenteredState
        title="Acceso restringido"
        description={`Inicia sesión en el CRM con ${TEST_RECIPIENT} antes de abrir esta página.`}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-8 text-[#243126]">
      <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-[#d8d2c7] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#edf5ea] p-3 text-[#1f6b3a]">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1f6b3a]">Quindío Exquisito</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Prueba interna de ZeptoMail</h1>
            <p className="mt-3 text-sm leading-6 text-[#687368]">
              Esta pantalla solo permite enviar la plantilla de prueba al correo interno autorizado.
            </p>
          </div>
        </div>

        <dl className="mt-7 grid gap-3 rounded-2xl bg-[#f4f7f2] p-5 text-sm sm:grid-cols-[150px_1fr]">
          <dt className="font-black">Desde</dt>
          <dd className="break-all">Quindío Exquisito | Ventas &lt;ventas@quindioexquisito.com&gt;</dd>
          <dt className="font-black">Para</dt>
          <dd className="break-all">{TEST_RECIPIENT}</dd>
          <dt className="font-black">Asunto</dt>
          <dd>[PRUEBA INTERNA] Actualización de datos – Quindío Exquisito</dd>
          <dt className="font-black">Formulario</dt>
          <dd>
            <a className="font-bold text-[#1f6b3a] underline" href={TEST_FORM_URL} target="_blank" rel="noreferrer">
              Abrir enlace validado
            </a>
          </dd>
        </dl>

        <div className="mt-6 rounded-2xl border border-[#d8d2c7] p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#1f6b3a]" size={20} />
            <div>
              <h2 className="font-black">Controles activos</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#687368]">
                <li>El destinatario está bloqueado a {TEST_RECIPIENT}.</li>
                <li>La clave de ZeptoMail permanece en Supabase y no llega al navegador.</li>
                <li>La función valida tu sesión antes de aceptar el envío.</li>
              </ul>
            </div>
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-[#d8d2c7] p-4 text-sm font-bold">
          <input
            className="mt-1 h-5 w-5 accent-[#1f6b3a]"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirmo que deseo enviar una única prueba interna a {TEST_RECIPIENT}.
        </label>

        {result ? (
          <div
            className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ${
              result.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
            }`}
          >
            {result.tone === "success" ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : null}
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
            disabled={!confirmed || sending || result?.tone === "success"}
            onClick={() => void sendInternalTest()}
          >
            {sending ? "Enviando…" : result?.tone === "success" ? "Prueba enviada" : "Enviar prueba interna"}
          </button>
        </div>
      </section>
    </main>
  );
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
