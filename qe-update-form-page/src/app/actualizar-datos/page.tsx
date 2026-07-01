"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
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
    <Suspense fallback={<main className="min-h-screen px-4 py-10">Cargando formulario...</main>}>
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
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-8 text-[#243126]">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8d2c7] bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Actualización de datos</h1>
        <p className="mt-3 text-sm leading-6 text-[#687368]">
          Revisa la información que tenemos registrada. Si todo sigue igual, marca la confirmación y envía. Si hay cambios, corrige los campos necesarios.
        </p>

        <div className="mt-6 rounded-2xl bg-[#f4f7f2] p-4 text-sm">
          <p><strong>Cliente:</strong> {customer?.nombre_cliente || ""}</p>
          <p><strong>Razón social actual:</strong> {customer?.razon_social || ""}</p>
          <p><strong>NIT actual:</strong> {customer?.nit || ""}</p>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <label className="flex gap-3 rounded-2xl border border-[#d8d2c7] p-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={confirmNoChanges}
              onChange={(event) => setConfirmNoChanges(event.target.checked)}
            />
            Confirmo que los datos siguen iguales.
          </label>

          <FormSection title="Datos generales">
            <TextField label="Razón social" value={form.razon_social_nueva} onChange={(value) => updateField("razon_social_nueva", value)} />
            <TextField label="NIT" value={form.nit_nuevo} onChange={(value) => updateField("nit_nuevo", value)} />
            <TextField label="Dirección" value={form.direccion_nueva} onChange={(value) => updateField("direccion_nueva", value)} />
          </FormSection>

          <FormSection title="Información comercial">
            <TextField label="Contacto comercial" value={form.contacto_comercial_nuevo} onChange={(value) => updateField("contacto_comercial_nuevo", value)} />
            <TextField label="Cargo contacto" value={form.cargo_contacto_nuevo} onChange={(value) => updateField("cargo_contacto_nuevo", value)} />
            <TextField label="Celular / teléfono comercial" value={form.celular_comercial_nuevo} onChange={(value) => updateField("celular_comercial_nuevo", value)} />
            <TextField label="Correo comercial" type="email" value={form.correo_comercial_nuevo} onChange={(value) => updateField("correo_comercial_nuevo", value)} />
          </FormSection>

          <FormSection title="Información financiera">
            <TextField label="Contacto de pagos" value={form.contacto_pagos_nuevo} onChange={(value) => updateField("contacto_pagos_nuevo", value)} />
            <TextField label="Cargo contacto pagos" value={form.cargo_pagos_nuevo} onChange={(value) => updateField("cargo_pagos_nuevo", value)} />
            <TextField label="Teléfono tesorería" value={form.telefono_tesoreria_nuevo} onChange={(value) => updateField("telefono_tesoreria_nuevo", value)} />
            <TextField label="Correo tesorería" type="email" value={form.correo_tesoreria_nuevo} onChange={(value) => updateField("correo_tesoreria_nuevo", value)} />
            <TextField label="Correo facturación electrónica" type="email" value={form.correo_facturacion_nuevo} onChange={(value) => updateField("correo_facturacion_nuevo", value)} />
          </FormSection>

          <label className="block text-sm font-bold">
            Observaciones
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-[#d8d2c7] px-3 py-2 font-normal outline-none focus:border-[#1f6b3a]"
              value={form.observaciones_cliente}
              onChange={(event) => updateField("observaciones_cliente", event.target.value)}
              placeholder="Indica cualquier cambio adicional o aclaración."
            />
          </label>

          <button
            className="w-full rounded-xl bg-[#1f6b3a] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Enviar actualización"}
          </button>
        </form>
      </section>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#687368]">{title}</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-[#d8d2c7] px-3 py-2 font-normal outline-none focus:border-[#1f6b3a]"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Centered({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 text-[#243126]">
      <section className="max-w-md rounded-3xl border border-[#d8d2c7] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#1f6b3a]">Quindío Exquisito</p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#687368]">{description}</p>
      </section>
    </main>
  );
}
