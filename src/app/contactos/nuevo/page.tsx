"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Home,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";
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
  const { supabase, sessionReady, isAuthenticated, signIn } = useCrmSession();
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
    if (isAuthenticated) void loadData();
  }, [isAuthenticated]);

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
    const requestedCompanyId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") || "" : "";
    const queryCompanyId = loadedCompanies.some((company) => company.id === requestedCompanyId) ? requestedCompanyId : "";

    setCompanies(loadedCompanies);
    setContacts((contactsResult.data || []) as Contact[]);
    setForm((current) => ({ ...current, companyId: current.companyId || queryCompanyId || loadedCompanies[0]?.id || "" }));
    setLoading(false);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);

    const error = await signIn(email, password);

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
          <p className="login-copy">Inicia sesión para crear contactos comerciales en Supabase.</p>

          <form className="form-stack" onSubmit={handleSignIn}>
            <label className="field-label">
              Email
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field-label">
              Password
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {authError ? <p className="alert alert-danger">{authError}</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={loading}>
              <ShieldCheck size={18} />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="/">
          <span className="brand-mark">QE</span>
          <div>
            <p>Quindío Exquisito</p>
            <strong>CRM B2B</strong>
          </div>
        </a>

        <nav className="sidebar-nav" aria-label="Vistas del CRM">
          <a className="nav-button" href="/">
            <Home size={18} />
            <span>Inicio</span>
          </a>
          <a className="nav-button active" href="/contactos/nuevo">
            <UsersRound size={18} />
            <span>Agregar contacto</span>
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quindío Exquisito CRM</p>
            <h1>Agregar contacto</h1>
          </div>
          <div className="topbar-actions">
            <a className="btn btn-secondary" href="/">
              <Home size={17} />
              Volver al CRM
            </a>
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
            <a className="btn btn-primary global-topbar-add-action" href="/agregar" aria-label="Agregar cliente o contacto">
              <Plus size={17} />
              Agregar
            </a>
          </div>
        </header>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="crm-grid">
          <section className="list-panel">
            <div className="panel-toolbar">
              <div>
                <p className="panel-kicker">Nuevo contacto</p>
                <h2>Datos comerciales</h2>
              </div>
              <span className="result-count">{selectedCompanyContacts.length}</span>
            </div>

            <form className="activity-form" onSubmit={handleSave}>
              <div className="form-grid">
                <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                  Cliente
                  <select className="select" value={form.companyId} onChange={(event) => updateField("companyId", event.target.value)} required>
                    <option value="">Seleccionar cliente</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                  Nombre completo
                  <input className="input" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
                </label>

                <label className="field-label">
                  Tipo de contacto
                  <select className="select" value={form.contactType} onChange={(event) => updateField("contactType", event.target.value as ContactType)}>
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

                <label className="field-label">
                  Email
                  <input className="input" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                </label>

                <label className="field-label">
                  Teléfono / WhatsApp
                  <input className="input" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                </label>

                <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                  Notas
                  <textarea className="textarea" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
                </label>
              </div>

              {duplicateWarnings.length ? (
                <div className="review-error">
                  <strong>Posible duplicado. Revisar antes de guardar:</strong>
                  <div className="issue-row">
                    {duplicateWarnings.map((warning) => (
                      <span className="issue-badge" key={warning}>{warning}</span>
                    ))}
                  </div>
                  <span>No se bloquea el guardado porque una persona puede atender varias sedes o cuentas.</span>
                </div>
              ) : null}

              <div className="panel-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setForm({ ...emptyForm, companyId: form.companyId })} disabled={saving}>
                  Limpiar
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  <UserRound size={17} />
                  {saving ? "Guardando" : "Guardar contacto"}
                </button>
              </div>
            </form>
          </section>

          <aside className="detail-panel">
            <div className="detail-header">
              <div>
                <div className="tag-row">
                  <span className="badge tone-emerald">Cliente actual</span>
                  {selectedCompany?.segment ? <span className="badge">{selectedCompany.segment}</span> : <span className="badge tone-amber">Segmento pendiente</span>}
                </div>
                <h2>{selectedCompany?.name || "Selecciona un cliente"}</h2>
                <p>{selectedCompany?.legal_name || "Razón social pendiente"}</p>
              </div>
            </div>

            <section className="detail-grid">
              <DetailItem icon={<Tag size={18} />} label="NIT" value={selectedCompany?.nit} />
              <DetailItem icon={<Building2 size={18} />} label="Ciudad" value={selectedCompany?.city} />
              <DetailItem icon={<Phone size={18} />} label="Teléfono" value={selectedCompany?.phone} />
              <DetailItem icon={<UsersRound size={18} />} label="Contactos" value={String(selectedCompanyContacts.length)} />
            </section>

            <section className="detail-section">
              <div className="section-title-row">
                <h3>Contactos actuales</h3>
                <span>{selectedCompanyContacts.length}</span>
              </div>
              <div className="stack">
                {selectedCompanyContacts.length ? (
                  selectedCompanyContacts.map((contact) => <ContactSummary key={contact.id} contact={contact} />)
                ) : (
                  <EmptyState title="Sin contactos" description="Este cliente todavía no tiene contactos asociados." />
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
    <article className={`contact-card ${getContactIssues(contact).length ? "needs-data" : ""}`}>
      <span className="avatar">
        <UserRound size={18} />
      </span>
      <div>
        <h4>{contact.full_name || "Sin nombre"}</h4>
        <p>{formatContactRole(contact.role)}</p>
        <div className="contact-links">
          {contact.email ? (
            <a href={`mailto:${contact.email}`}>
              <Mail size={14} />
              {contact.email}
            </a>
          ) : (
            <span>
              <Mail size={14} />
              Sin email
            </span>
          )}
          {contact.phone ? (
            <span>
              <Phone size={14} />
              {contact.phone}
            </span>
          ) : null}
        </div>
        {getContactIssues(contact).length ? (
          <div className="issue-row">
            {getContactIssues(contact).map((issue) => <span className="issue-badge" key={issue}>{issue}</span>)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return (
    <dl className="detail-item">
      {icon}
      <div>
        <dt>{label}</dt>
        <dd>{value || "—"}</dd>
      </div>
    </dl>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="centered-message">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function buildDuplicateWarnings(contacts: Contact[], form: FormState, selectedCompany: Company | null) {
  const email = normalizeEmail(form.email);
  const phone = normalizePhone(form.phone);
  const name = normalizeName(form.fullName);

  if (!email && !phone && !name) return [];

  const warnings = new Set<string>();

  contacts.forEach((contact) => {
    const reference = formatContactReference(contact);

    if (email && splitContactEmails(contact.email).some((item) => normalizeEmail(item) === email)) {
      warnings.add(`Email ya existe en ${reference}`);
    }

    const contactPhone = normalizePhone(contact.phone);
    if (phone && contactPhone && (contactPhone === phone || contactPhone.slice(-7) === phone.slice(-7))) {
      warnings.add(`Teléfono similar en ${reference}`);
    }

    if (selectedCompany && contact.company_id === selectedCompany.id && name && normalizeName(contact.full_name) === name) {
      warnings.add(`Nombre repetido dentro de ${selectedCompany.name}`);
    }
  });

  return Array.from(warnings);
}

function getContactIssues(contact: Contact) {
  const issues: string[] = [];
  if (!contact.email?.trim()) issues.push("Email pendiente");
  if (!contact.role?.trim()) issues.push("Rol pendiente");
  return issues;
}

function formatContactReference(contact: Contact) {
  return [contact.full_name || "contacto sin nombre", contact.company_name || "empresa pendiente"].join(" / ");
}

function splitContactEmails(value?: string | null) {
  return (value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value?: string | null) {
  return cleanText(value).toLowerCase();
}

function normalizePhone(value?: string | null) {
  return cleanText(value).replace(/\D/g, "");
}

function normalizeName(value?: string | null) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function cleanText(value?: string | null) {
  return (value || "").trim();
}

function formatContactRole(role?: string | null) {
  if (!role) return "Rol pendiente";
  return role.replace(/_/g, " ");
}
