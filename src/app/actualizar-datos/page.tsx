"use client";

import { FormEvent, Suspense, type ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type CustomerFormData = {
  cliente_id?: string;
  nombre_cliente?: string;
  razon_social?: string;
  nit?: string;
  contacto_actual?: string;
  telefono_actual?: string;
  correo_actual?: string;
  direccion_actual?: string;
  segmento?: string;
};

type FormState = {
  razon_social_nueva: string;
  nit_nuevo: string;
  contacto_comercial_nuevo: string;
  cargo_contacto_nuevo: string;
  celular_comercial_nuevo: string;
  correo_comercial_nuevo: string;
  contacto_pagos_nuevo: string;
  cargo_pagos_nuevo: string;
  telefono_tesoreria_nuevo: string;
  correo_tesoreria_nuevo: string;
  correo_facturacion_nuevo: string;
  direccion_nueva: string;
  observaciones_cliente: string;
};

const emptyForm: FormState = {
  razon_social_nueva: "",
  nit_nuevo: "",
  contacto_comercial_nuevo: "",
  cargo_contacto_nuevo: "",
  celular_comercial_nuevo: "",
  correo_comercial_nuevo: "",
  contacto_pagos_nuevo: "",
  cargo_pagos_nuevo: "",
  telefono_tesoreria_nuevo: "",
  correo_tesoreria_nuevo: "",
  correo_facturacion_nuevo: "",
  direccion_nueva: "",
  observaciones_cliente: "",
};

export default function ActualizarDatosPage() {
  return (
    <Suspense fallback={<Centered title="Cargando formulario" description="Estamos preparando la actualización de datos." />}>
      <ActualizarDatosContent />
    </Suspense>
  );
}

function ActualizarDatosContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFormData | null>(null);
  const [confirmNoChanges, setConfirmNoChanges] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    async function loadCustomer() {
      if (!token) {
        setError("El enlace no tiene token de validación.");
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_cu_form", { p_token: token });

      if (rpcError || !data) {
        setError("El enlace no es válido, venció o ya no está activo.");
        setLoading(false);
        return;
      }

      const current = data as CustomerFormData;
      setCustomer(current);
      setForm({
        ...emptyForm,
        razon_social_nueva: current.razon_social || "",
        nit_nuevo: current.nit || "",
        contacto_comercial_nuevo: current.contacto_actual || "",
        celular_comercial_nuevo: current.telefono_actual || "",
        correo_comercial_nuevo: current.correo_actual || "",
        direccion_nueva: current.direccion_actual || "",
      });
      setLoading(false);
    }

    void loadCustomer();
  }, [supabase, token]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      confirm_no_changes: confirmNoChanges,
      nombre_cliente: customer?.nombre_cliente || "",
      cliente_id: customer?.cliente_id || "",
    };

    const { error: submitError } = await supabase.rpc("submit_cu_form", {
      p_token: token,
      p_payload: payload,
    });

    if (submitError) {
      setError("No pudimos guardar la actualización. Por favor intenta de nuevo o contacta a Quindío Exquisito.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) {
    return <Centered title="Cargando datos" description="Estamos validando tu enlace de actualización." />;
  }

  if (error && !customer) {
    return <Centered title="Enlace no disponible" description={error} />;
  }

  if (submitted) {
    return (
      <Centered
        title="Datos recibidos"
        description="Gracias. Quindío Exquisito recibió tu actualización y la revisará internamente."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-5 text-[#243126] sm:py-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-5 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <aside className="rounded-[1.75rem] border border-[#d8d2c7] bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Actualización de datos</h1>
          <p className="mt-3 text-sm leading-6 text-[#687368]">
            Revisa la información registrada. Si todo sigue igual, marca la confirmación y envía. Si hay cambios, actualiza solo los campos necesarios.
          </p>

          <div className="mt-5 rounded-2xl bg-[#f4f7f2] p-4 text-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#687368]">Cliente</p>
            <h2 className="mt-1 text-xl font-black">{customer?.nombre_cliente || "Cliente"}</h2>
            {customer?.segmento ? (
              <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1f6b3a]">
                {customer.segmento}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <CurrentValue label="Razón social actual" value={customer?.razon_social} />
            <CurrentValue label="NIT actual" value={customer?.nit} />
            <CurrentValue label="Contacto actual" value={customer?.contacto_actual} />
            <CurrentValue label="Teléfono actual" value={customer?.telefono_actual} />
            <CurrentValue label="Correo actual" value={customer?.correo_actual} />
            <CurrentValue label="Dirección actual" value={customer?.direccion_actual} />
          </div>
        </aside>

        <section className="rounded-[1.75rem] border border-[#d8d2c7] bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          {error ? <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}

          <form className="space-y-6 pb-24 sm:pb-0" onSubmit={handleSubmit}>
            <label className="flex cursor-pointer gap-3 rounded-2xl border-2 border-[#1f6b3a] bg-[#f4f7f2] p-4 text-sm font-bold transition hover:bg-[#eef4eb]">
              <input
                className="mt-1 h-5 w-5 accent-[#1f6b3a]"
                type="checkbox"
                checked={confirmNoChanges}
                onChange={(event) => setConfirmNoChanges(event.target.checked)}
              />
              <span>
                <span className="block text-base">Confirmo que mis datos siguen iguales</span>
                <span className="mt-1 block font-normal text-[#687368]">
                  Marca esta opción si no hay cambios en la información registrada.
                </span>
              </span>
            </label>

            {confirmNoChanges ? (
              <section className="rounded-2xl border border-[#d8d2c7] bg-[#fffaf1] p-4 text-sm leading-6 text-[#5f4a1f]">
                Solo enviaremos la confirmación de que los datos siguen vigentes. Puedes agregar una observación antes de enviar.
              </section>
            ) : (
              <>
                <FormSection title="Datos generales" description="Información legal y de ubicación del cliente.">
                  <TextField label="Razón social" value={form.razon_social_nueva} onChange={(value) => updateField("razon_social_nueva", value)} />
                  <TextField label="NIT" value={form.nit_nuevo} onChange={(value) => updateField("nit_nuevo", value)} />
                  <TextField className="md:col-span-2" label="Dirección" value={form.direccion_nueva} onChange={(value) => updateField("direccion_nueva", value)} />
                </FormSection>

                <FormSection title="Información comercial" description="Persona o área encargada de pedidos y compras.">
                  <TextField label="Contacto comercial" value={form.contacto_comercial_nuevo} onChange={(value) => updateField("contacto_comercial_nuevo", value)} />
                  <TextField label="Cargo contacto" value={form.cargo_contacto_nuevo} onChange={(value) => updateField("cargo_contacto_nuevo", value)} />
                  <TextField label="Celular / teléfono comercial" value={form.celular_comercial_nuevo} onChange={(value) => updateField("celular_comercial_nuevo", value)} />
                  <TextField label="Correo comercial" type="email" value={form.correo_comercial_nuevo} onChange={(value) => updateField("correo_comercial_nuevo", value)} />
                </FormSection>

                <FormSection title="Información financiera" description="Datos para pagos, tesorería y facturación electrónica.">
                  <TextField label="Contacto de pagos" value={form.contacto_pagos_nuevo} onChange={(value) => updateField("contacto_pagos_nuevo", value)} />
                  <TextField label="Cargo contacto pagos" value={form.cargo_pagos_nuevo} onChange={(value) => updateField("cargo_pagos_nuevo", value)} />
                  <TextField label="Teléfono tesorería" value={form.telefono_tesoreria_nuevo} onChange={(value) => updateField("telefono_tesoreria_nuevo", value)} />
                  <TextField label="Correo tesorería" type="email" value={form.correo_tesoreria_nuevo} onChange={(value) => updateField("correo_tesoreria_nuevo", value)} />
                  <TextField className="md:col-span-2" label="Correo facturación electrónica" type="email" value={form.correo_facturacion_nuevo} onChange={(value) => updateField("correo_facturacion_nuevo", value)} />
                </FormSection>
              </>
            )}

            <label className="block text-sm font-bold">
              Observaciones
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8d2c7] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#1f6b3a] focus:ring-4 focus:ring-[#1f6b3a]/10"
                value={form.observaciones_cliente}
                onChange={(event) => updateField("observaciones_cliente", event.target.value)}
                placeholder="Indica cualquier cambio adicional o aclaración."
              />
            </label>

            <div className="fixed inset-x-0 bottom-0 border-t border-[#d8d2c7] bg-white/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <button
                className="w-full rounded-2xl bg-[#1f6b3a] px-5 py-4 text-sm font-black text-white transition hover:bg-[#195a31] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Enviando..." : confirmNoChanges ? "Confirmar datos" : "Enviar actualización"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#d8d2c7] p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#1f6b3a]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#687368]">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-bold ${className}`}>
      {label}
      <input
        className="mt-2 w-full rounded-2xl border border-[#d8d2c7] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#1f6b3a] focus:ring-4 focus:ring-[#1f6b3a]/10"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CurrentValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-[#ece6da] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#687368]">{label}</p>
      <p className="mt-1 break-words font-bold">{value || "No registrado"}</p>
    </div>
  );
}

function Centered({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-[#243126]">
      <section className="max-w-md rounded-[1.75rem] border border-[#d8d2c7] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#687368]">{description}</p>
      </section>
    </main>
  );
}
