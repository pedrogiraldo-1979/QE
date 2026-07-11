"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Company, Contact } from "@/lib/types";

const CONTACT_TYPES = ["principal", "secundario", "compras", "chef", "almacen", "operaciones", "administrativo"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

type FormState = {
  companyId: string;
  fullName: string;
  contactType: ContactType;
  position: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = {
  companyId: "",
  fullName: "",
  contactType: "principal",
  position: "",
  email: "",
  phone: "",
  notes: "",
};

export default function NewContactPage() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(data.session));
      setSessionReady(true);
      if (data.session) void loadData();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setSessionReady(true);
      if (session) void loadData();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [companiesResult, contactsResult] = await Promise.all([
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("contacts").select("*").order("company_name", { ascending: true }),
    ]);

    if (companiesResult.error || contactsResult.error) {
      setMessage(companiesResult.error?.message || contactsResult.error?.message || "Error cargando datos.");
      setLoading(false);
      return;
    }

    const loadedCompanies = (companiesResult.data || []) as Company[];
    setCompanies(loadedCompanies);
    setContacts((contactsResult.data || []) as Contact[]);
    setForm((current) => ({ ...current, companyId: current.companyId || loadedCompanies[0]?.id || "" }));
    setLoading(false);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCompany = companies.find((company) => company.id === form.companyId);
    const fullName = cleanText(form.fullName);
    const normalizedEmail = normalizeEmail(form.email);
    const phone = cleanText(form.phone);

    if (!selectedCompany) {
      setMessage("Selecciona una empresa antes de guardar.");
      return;
    }

    if (!fullName) {
      setMessage("Agrega el nombre del contacto.");
      return;
    }

    if (!normalizedEmail && !phone) {
      setMessage("Agrega al menos email o teléfono para que el contacto sea útil en CRM.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const notes = [
      cleanText(form.notes),
      form.position.trim() ? `Cargo/rol: ${cleanText(form.position)}` : null,
      `Tipo CRM: ${form.contactType}`,
      "Fuente: app_crm",
      duplicateWarnings.length ? `Advertencias al crear: ${duplicateWarnings.join(" | ")}` : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join("\n");

    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        full_name: fullName,
        role: form.contactType,
        email: normalizedEmail || null,
        phone: phone || null,
        notes: notes || null,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setContacts((current) => [inserted as Contact, ...current]);
    setForm({ ...emptyForm, companyId: selectedCompany.id });
    setSaving(false);
    setMessage(duplicateWarnings.length ? "Contacto creado con advertencias de posible duplicado." : "Contacto creado.");
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const selectedCompany = useMemo(() => companies.find((company) => company.id === form.companyId) || null, [companies, form.companyId]);
  const selectedCompanyContacts = useMemo(() => contacts.filter((contact) => contact.company_id === form.companyId), [contacts, form.companyId]);
  const duplicateWarnings = useMemo(() => buildDuplicateWarnings(contacts, form, selectedCompany), [contacts, form, selectedCompany]);

  if (!sessionReady) return <CenteredMessage title="Cargando CRM" description="Validando sesión..." />;

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen px-4 py-10">
        <section className="mx-auto max-w-md card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Quindío Exquisito</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Agregar contacto</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Inicia sesión para crear contactos en Supabase.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <label className="block text-sm font-bold">
              Email
              <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-bold">
              Password
              <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {authError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]">{authError}</p> : null}
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 lg:px-8">
      <header className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Quindío Exquisito</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Agregar contacto</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Crea contactos nuevos en CRM sin tocar las hojas de limpieza.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
      </header>

      {message ? <section className="mx-auto mt-4 max-w-5xl rounded-xl border border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">{message}</section> : null}

      <section className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form className="card p-5" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold md:col-span-2">
              Empresa
              <select className="select mt-2" value={form.companyId} onChange={(event) => updateField("companyId", event.target.value)} required>
                <option value="">Seleccionar empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold md:col-span-2">
              Nombre completo
              <input className="input mt-2" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
            </label>

            <label className="block text-sm font-bold">
              Tipo de contacto
              <select className="select mt-2" value={form.contactType} onChange={(event) => updateField("contactType", event.target.value as ContactType)}>
                {CONTACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold">
              Cargo / rol operativo
              <input className="input mt-2" value={form.position} onChange={(event) => updateField("position", event.target.value)} placeholder="Ej. Jefe de compras" />
            </label>

            <label className="block text-sm font-bold">
              Email
              <input className="input mt-2" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>

            <label className="block text-sm font-bold">
              Teléfono / WhatsApp
              <input className="input mt-2" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>

            <label className="block text-sm font-bold md:col-span-2">
              Notas
              <textarea className="textarea mt-2 min-h-24" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </label>
          </div>

          {duplicateWarnings.length ? (
            <div className="mt-4 rounded-xl border border-[var(--accent)] bg-white p-3 text-sm leading-6 text-[var(--muted)]">
              <p className="font-black text-[var(--foreground)]">Posible duplicado. Revisar antes de guardar:</p>
              <ul className="mt-1 list-disc pl-5">
                {duplicateWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">No se bloquea el guardado porque una persona puede atender varias sedes o cuentas.</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar contacto"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setForm({ ...emptyForm, companyId: form.companyId })} disabled={saving}>
              Limpiar
            </button>
          </div>
        </form>

        <aside className="card p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--muted)]">Contactos actuales</h2>
          <p className="mt-2 text-sm font-bold">{selectedCompany?.name || "Selecciona una empresa"}</p>
          <div className="mt-4 space-y-3">
            {selectedCompanyContacts.length ? (
              selectedCompanyContacts.map((contact) => <ContactSummary key={contact.id} contact={contact} />)
            ) : (
              <p className="text-sm text-[var(--muted)]">No hay contactos asociados a esta empresa.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function ContactSummary({ contact }: { contact: Contact }) {
  return (
    <article className="rounded-xl border border-[var(--border)] p-3 text-sm">
      <p className="font-black">{contact.full_name || "Sin nombre"}</p>
      <p className="mt-1 capitalize text-[var(--muted)]">{contact.role || "Rol pendiente"}</p>
      <p className="mt-2 break-words">{contact.email || "Sin email"}</p>
      <p className="mt-1 text-[var(--muted)]">{contact.phone || "Sin teléfono"}</p>
    </article>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function buildDuplicateWarnings(contacts: Contact[], form: FormState, selectedCompany: Company | null) {
  const warnings = new Set<string>();
  const formEmail = normalizeEmail(form.email);
  const formPhone = normalizePhone(form.phone);
  const formName = normalizeName(form.fullName);

  if (formEmail) {
    contacts
      .filter((contact) => splitContactEmails(contact.email).includes(formEmail))
      .slice(0, 3)
      .forEach((contact) => warnings.add(`Email ya existe en ${formatContactReference(contact)}.`));
  }

  if (formPhone.length >= 7) {
    contacts
      .filter((contact) => {
        const contactPhone = normalizePhone(contact.phone);
        if (contactPhone.length < 7) return false;
        return contactPhone === formPhone || contactPhone.endsWith(formPhone.slice(-7)) || formPhone.endsWith(contactPhone.slice(-7));
      })
      .slice(0, 3)
      .forEach((contact) => warnings.add(`Teléfono similar en ${formatContactReference(contact)}.`));
  }

  if (formName && selectedCompany) {
    contacts
      .filter((contact) => contact.company_id === selectedCompany.id && normalizeName(contact.full_name) === formName)
      .slice(0, 3)
      .forEach((contact) => warnings.add(`Mismo nombre dentro de esta empresa: ${formatContactReference(contact)}.`));
  }

  return Array.from(warnings);
}

function formatContactReference(contact: Contact) {
  const label = contact.full_name || contact.email || contact.phone || "contacto sin nombre";
  const company = contact.company_name ? ` (${contact.company_name})` : "";
  return `${label}${company}`;
}

function splitContactEmails(value?: string | null) {
  return (value || "")
    .split(/[;,]/)
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function normalizeEmail(value?: string | null) {
  return cleanText(value || "").toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function normalizeName(value?: string | null) {
  return cleanText(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
