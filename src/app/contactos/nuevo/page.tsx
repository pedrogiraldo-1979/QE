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
  const [loginEmail, setLoginEmail] = useState("");
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
      setMessage(companiesResult.error?.message || contactsResult.error?.message || "No pudimos cargar los datos.");
      setLoading(false);
      return;
    }

    const loadedCompanies = (companiesResult.data || []) as Company[];
    const loadedContacts = (contactsResult.data || []) as Contact[];
    const requestedCompanyId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") || "" : "";
    const queryCompanyId = loadedCompanies.some((company) => company.id === requestedCompanyId) ? requestedCompanyId : "";

    setCompanies(loadedCompanies);
    setContacts(loadedContacts);
    setForm((current) => ({ ...current, companyId: current.companyId || queryCompanyId || loadedCompanies[0]?.id || "" }));
    setLoading(false);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

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
      <main className="login-screen">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">QE</span>
            <div>
              <p className="eyebrow">Quindío Exquisito</p>
              <h1>Agregar contacto</h1>
            </div>
          </div>
          <p className="login-copy">Inicia sesión para crear contactos en Supabase.</p>

          <form className="form-stack" onSubmit={handleSignIn}>
            <label className="field-label">
              Email
              <input className="input" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
            </label>
            <label className="field-label">
              Password
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {authError ? <p className="alert alert-danger">{authError}</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quindío Exquisito CRM</p>
            <h1>Agregar contacto</h1>
            <p>Crea contactos nuevos sin tocar Google Sheets ni procesos de limpieza.</p>
          </div>
          <div className="topbar-actions">
            <a className="btn btn-secondary" href="/">
              Volver al CRM
            </a>
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              {loading ? "Actualizando" : "Refrescar"}
            </button>
          </div>
        </header>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="crm-grid">
          <form className="list-panel form-stack" onSubmit={handleSave}>
            <div className="panel-toolbar">
              <div>
                <p className="panel-kicker">Nuevo registro</p>
                <h2>Datos del contacto</h2>
              </div>
            </div>

            <label className="field-label">
              Empresa
              <select className="input" value={form.companyId} onChange={(event) => updateField("companyId", event.target.value)} required>
                <option value="">Seleccionar empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Nombre completo
              <input className="input" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
            </label>

            <div className="filters-row filters-row-simple">
              <label className="field-label">
                Tipo de contacto
                <select className="input" value={form.contactType} onChange={(event) => updateField("contactType", event.target.value as ContactType)}>
                  {CONTACT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Cargo / rol operativo
                <input className="input" value={form.position} onChange={(event) => updateField("position", event.target.value)} placeholder="Ej. Jefe de compras" />
              </label>
            </div>

            <div className="filters-row filters-row-simple">
              <label className="field-label">
                Email
                <input className="input" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
              </label>
              <label className="field-label">
                Teléfono / WhatsApp
                <input className="input" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </label>
            </div>

            <label className="field-label">
              Notas
              <textarea className="textarea" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </label>

            {duplicateWarnings.length ? (
              <div className="alert alert-info">
                <strong>Posible duplicado. Revisar antes de guardar:</strong>
                <ul>
                  {duplicateWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <span>No se bloquea el guardado porque una persona puede atender varias sedes o cuentas.</span>
              </div>
            ) : null}

            <div className="row-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar contacto"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setForm({ ...emptyForm, companyId: form.companyId })} disabled={saving}>
                Limpiar
              </button>
            </div>
          </form>

          <aside className="detail-panel">
            <div className="detail-header">
              <div>
                <div className="tag-row">
                  <span className="badge tone-emerald">Cliente actual</span>
                  <span className="badge">{selectedCompany?.segment || "sin segmento"}</span>
                </div>
                <h2>{selectedCompany?.name || "Selecciona una empresa"}</h2>
                <p>{selectedCompany?.legal_name || "Contactos actuales"}</p>
              </div>
            </div>
            <section className="detail-section">
              <div className="section-title-row">
                <h3>Contactos actuales</h3>
                <span>{selectedCompanyContacts.length}</span>
              </div>
              <div className="stack">
                {selectedCompanyContacts.length ? (
                  selectedCompanyContacts.map((contact) => <ContactSummary key={contact.id} contact={contact} />)
                ) : (
                  <CenteredMessage title="Sin contactos" description="No hay contactos asociados a esta empresa." />
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function ContactSummary({ contact }: { contact: Contact }) {
  return (
    <article className="contact-card">
      <strong>{contact.full_name || "Sin nombre"}</strong>
      <span>{contact.role || "Rol pendiente"}</span>
      <span>{contact.email || "Sin email"}</span>
      <span>{contact.phone || "Sin teléfono"}</span>
    </article>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function buildDuplicateWarnings(contacts: Contact[], form: FormState, selectedCompany: Company | null) {
  const warnings: string[] = [];
  const email = normalizeEmail(form.email);
  const phone = normalizePhone(form.phone);
  const name = normalizeName(form.fullName);

  if (email) {
    const matches = contacts.filter((contact) => splitContactEmails(contact.email).includes(email));
    if (matches.length) warnings.push(`Email ya existe en ${formatContactReference(matches[0])}`);
  }

  if (phone) {
    const matches = contacts.filter((contact) => {
      const existingPhone = normalizePhone(contact.phone);
      if (!existingPhone) return false;
      return existingPhone === phone || existingPhone.slice(-7) === phone.slice(-7);
    });
    if (matches.length) warnings.push(`Teléfono similar en ${formatContactReference(matches[0])}`);
  }

  if (name && selectedCompany) {
    const matches = contacts.filter((contact) => contact.company_id === selectedCompany.id && normalizeName(contact.full_name) === name);
    if (matches.length) warnings.push(`Nombre repetido en la misma empresa: ${formatContactReference(matches[0])}`);
  }

  return warnings;
}

function formatContactReference(contact: Contact) {
  return [contact.full_name || "contacto sin nombre", contact.company_name || "empresa pendiente"].join(" / ");
}

function splitContactEmails(value?: string | null) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeName(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanText(value?: string | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
