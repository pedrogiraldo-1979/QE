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
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Company, Contact } from "@/lib/types";

type CreateMode = "selector" | "company" | "contact";

type CompanyForm = {
  name: string;
  legalName: string;
  nit: string;
  segment: string;
  city: string;
  phone: string;
  address: string;
  website: string;
  notes: string;
};

type ContactForm = {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyCompanyForm: CompanyForm = {
  name: "",
  legalName: "",
  nit: "",
  segment: "",
  city: "",
  phone: "",
  address: "",
  website: "",
  notes: "",
};

const emptyContactForm: ContactForm = {
  fullName: "",
  role: "principal",
  email: "",
  phone: "",
  notes: "",
};

export default function AddEntryPage() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<CreateMode>("selector");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [includePrimaryContact, setIncludePrimaryContact] = useState(true);
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
      setMessage(companiesResult.error?.message || contactsResult.error?.message || "No pudimos cargar datos de CRM.");
      setLoading(false);
      return;
    }

    setCompanies((companiesResult.data || []) as Company[]);
    setContacts((contactsResult.data || []) as Contact[]);
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

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = cleanText(companyForm.name);
    const primaryContactName = cleanText(contactForm.fullName);
    const primaryContactEmail = normalizeEmail(contactForm.email);
    const primaryContactPhone = cleanText(contactForm.phone);

    if (!name) {
      setMessage("Agrega el nombre comercial del cliente.");
      return;
    }

    if (includePrimaryContact && primaryContactName && !primaryContactEmail && !primaryContactPhone) {
      setMessage("Para crear el contacto principal agrega email o teléfono.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const companyNotes = [
      cleanText(companyForm.notes),
      "Fuente: app_crm",
      companyWarnings.length ? `Advertencias al crear: ${companyWarnings.join(" | ")}` : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join("\n");

    const { data: insertedCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        name,
        legal_name: cleanText(companyForm.legalName) || null,
        nit: cleanText(companyForm.nit) || null,
        segment: cleanText(companyForm.segment) || null,
        city: cleanText(companyForm.city) || null,
        phone: cleanText(companyForm.phone) || null,
        address: cleanText(companyForm.address) || null,
        website: cleanText(companyForm.website) || null,
        status: "por validar",
        notes: companyNotes || null,
      })
      .select("*")
      .single();

    if (companyError) {
      setMessage(companyError.message);
      setSaving(false);
      return;
    }

    const company = insertedCompany as Company;
    let contactCreated = false;

    if (includePrimaryContact && primaryContactName && (primaryContactEmail || primaryContactPhone)) {
      const contactNotes = [
        cleanText(contactForm.notes),
        `Tipo CRM: ${contactForm.role || "principal"}`,
        "Fuente: app_crm",
        "Creado junto con cliente nuevo",
      ]
        .filter((item): item is string => Boolean(item))
        .join("\n");

      const { data: insertedContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          company_id: company.id,
          company_name: company.name,
          full_name: primaryContactName,
          role: contactForm.role || "principal",
          email: primaryContactEmail || null,
          phone: primaryContactPhone || null,
          notes: contactNotes || null,
        })
        .select("*")
        .single();

      if (contactError) {
        setCompanies((current) => [company, ...current]);
        setMessage(`Cliente creado, pero falló el contacto principal: ${contactError.message}`);
        setSaving(false);
        return;
      }

      setContacts((current) => [insertedContact as Contact, ...current]);
      contactCreated = true;
    }

    setCompanies((current) => [company, ...current]);
    setCompanyForm(emptyCompanyForm);
    setContactForm(emptyContactForm);
    setIncludePrimaryContact(true);
    setSaving(false);
    setMessage(contactCreated ? "Cliente y contacto principal creados." : "Cliente creado.");
  }

  function updateCompanyField<K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) {
    setCompanyForm((current) => ({ ...current, [field]: value }));
  }

  function updateContactField<K extends keyof ContactForm>(field: K, value: ContactForm[K]) {
    setContactForm((current) => ({ ...current, [field]: value }));
  }

  const companyWarnings = useMemo(() => buildCompanyWarnings(companies, companyForm), [companies, companyForm]);

  if (!sessionReady) return <CenteredMessage title="Cargando CRM" description="Validando sesión..." />;

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">QE</span>
            <div>
              <p className="eyebrow">Quindío Exquisito</p>
              <h1>Agregar</h1>
            </div>
          </div>
          <p className="login-copy">Inicia sesión para crear clientes o contactos en CRM.</p>

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
          <a className="nav-button active" href="/agregar">
            <Plus size={18} />
            <span>Agregar</span>
          </a>
          <a className="nav-button" href="/prospectos">
            <Target size={18} />
            <span>Prospección</span>
          </a>
          <a className="nav-button" href="/contactos/nuevo">
            <UsersRound size={18} />
            <span>Contacto</span>
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quindío Exquisito CRM</p>
            <h1>Agregar al CRM</h1>
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
          </div>
        </header>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="action-grid">
          <button className="action-card" type="button" onClick={() => setMode("company")}>
            <span className="metric-icon"><Building2 size={19} /></span>
            <span>
              <strong>+</strong>
              <span className="action-label">Cliente nuevo</span>
              <span className="action-helper">Crear empresa en CRM y, si aplica, contacto principal.</span>
            </span>
          </button>

          <button className="action-card" type="button" onClick={() => setMode("contact")}>
            <span className="metric-icon"><UserRound size={19} /></span>
            <span>
              <strong>+</strong>
              <span className="action-label">Contacto en cliente existente</span>
              <span className="action-helper">Ir al formulario probado de contacto y escoger el cliente.</span>
            </span>
          </button>

          <a className="action-card" href="/prospectos/nuevo">
            <span className="metric-icon"><Target size={19} /></span>
            <span>
              <strong>+</strong>
              <span className="action-label">Prospecto nuevo</span>
              <span className="action-helper">Crear empresa prospecto dentro de una lista, sin campaña ni Zoho.</span>
            </span>
          </a>
        </section>

        {mode === "selector" ? (
          <section className="home-panel">
            <div className="home-copy">
              <h2>Escoge qué vas a crear</h2>
              <p>Usa cliente nuevo cuando la empresa todavía no existe en CRM. Usa contacto existente cuando solo vas a agregar una persona a un cliente ya creado. Usa prospecto nuevo cuando todavía está en revisión comercial.</p>
            </div>
          </section>
        ) : null}

        {mode === "contact" ? (
          <section className="home-panel">
            <div className="home-copy">
              <h2>Contacto para cliente existente</h2>
              <p>Este flujo usa el formulario que ya probamos, con validaciones de duplicados y guardado en `contacts`.</p>
            </div>
            <div className="topbar-actions" style={{ marginTop: 14 }}>
              <a className="btn btn-primary" href="/contactos/nuevo">
                <UserRound size={17} />
                Abrir formulario de contacto
              </a>
              <button className="btn btn-secondary" type="button" onClick={() => setMode("selector")}>Volver</button>
            </div>
          </section>
        ) : null}

        {mode === "company" ? (
          <section className="crm-grid">
            <section className="list-panel">
              <div className="panel-toolbar">
                <div>
                  <p className="panel-kicker">Nuevo cliente</p>
                  <h2>Datos de empresa</h2>
                </div>
                <span className="result-count">{companies.length}</span>
              </div>

              <form className="activity-form" onSubmit={handleCreateCompany}>
                <div className="form-grid">
                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Nombre comercial
                    <input className="input" value={companyForm.name} onChange={(event) => updateCompanyField("name", event.target.value)} required />
                  </label>
                  <label className="field-label">
                    Razón social
                    <input className="input" value={companyForm.legalName} onChange={(event) => updateCompanyField("legalName", event.target.value)} />
                  </label>
                  <label className="field-label">
                    NIT
                    <input className="input" value={companyForm.nit} onChange={(event) => updateCompanyField("nit", event.target.value)} />
                  </label>
                  <label className="field-label">
                    Segmento
                    <input className="input" value={companyForm.segment} onChange={(event) => updateCompanyField("segment", event.target.value)} placeholder="Hotel, restaurante, institucional..." />
                  </label>
                  <label className="field-label">
                    Ciudad
                    <input className="input" value={companyForm.city} onChange={(event) => updateCompanyField("city", event.target.value)} />
                  </label>
                  <label className="field-label">
                    Teléfono empresa
                    <input className="input" value={companyForm.phone} onChange={(event) => updateCompanyField("phone", event.target.value)} />
                  </label>
                  <label className="field-label">
                    Website
                    <input className="input" value={companyForm.website} onChange={(event) => updateCompanyField("website", event.target.value)} />
                  </label>
                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Dirección
                    <input className="input" value={companyForm.address} onChange={(event) => updateCompanyField("address", event.target.value)} />
                  </label>
                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Notas empresa
                    <textarea className="textarea" value={companyForm.notes} onChange={(event) => updateCompanyField("notes", event.target.value)} />
                  </label>
                </div>

                {companyWarnings.length ? (
                  <div className="review-error">
                    <strong>Posible cliente duplicado. Revisar antes de guardar:</strong>
                    <div className="issue-row">
                      {companyWarnings.map((warning) => <span className="issue-badge" key={warning}>{warning}</span>)}
                    </div>
                    <span>No se bloquea el guardado, pero conviene validar antes de crear otro cliente.</span>
                  </div>
                ) : null}

                <section className="detail-block">
                  <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={includePrimaryContact} onChange={(event) => setIncludePrimaryContact(event.target.checked)} />
                    Crear contacto principal inicial
                  </label>
                </section>

                {includePrimaryContact ? (
                  <div className="form-grid">
                    <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                      Nombre contacto principal
                      <input className="input" value={contactForm.fullName} onChange={(event) => updateContactField("fullName", event.target.value)} />
                    </label>
                    <label className="field-label">
                      Tipo / rol CRM
                      <input className="input" value={contactForm.role} onChange={(event) => updateContactField("role", event.target.value)} />
                    </label>
                    <label className="field-label">
                      Email
                      <input className="input" type="email" value={contactForm.email} onChange={(event) => updateContactField("email", event.target.value)} />
                    </label>
                    <label className="field-label">
                      Teléfono / WhatsApp
                      <input className="input" value={contactForm.phone} onChange={(event) => updateContactField("phone", event.target.value)} />
                    </label>
                    <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                      Notas contacto
                      <textarea className="textarea" value={contactForm.notes} onChange={(event) => updateContactField("notes", event.target.value)} />
                    </label>
                  </div>
                ) : null}

                <div className="panel-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => setMode("selector")} disabled={saving}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    <Plus size={17} />
                    {saving ? "Guardando" : "Crear cliente"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="detail-panel">
              <div className="detail-header">
                <div>
                  <div className="tag-row">
                    <span className="badge tone-amber">Nuevo cliente</span>
                    <span className="badge">Estado inicial: por validar</span>
                  </div>
                  <h2>{companyForm.name || "Cliente nuevo"}</h2>
                  <p>{companyForm.legalName || "Razón social pendiente"}</p>
                </div>
              </div>

              <section className="detail-grid">
                <DetailItem icon={<Tag size={18} />} label="NIT" value={companyForm.nit} />
                <DetailItem icon={<Building2 size={18} />} label="Ciudad" value={companyForm.city} />
                <DetailItem icon={<Phone size={18} />} label="Teléfono" value={companyForm.phone} />
                <DetailItem icon={<Mail size={18} />} label="Contacto" value={contactForm.fullName} />
              </section>

              <section className="detail-block">
                <h3>Regla operativa</h3>
                <p>El cliente se guarda en `companies` y queda como `por validar`. Si agregas contacto principal, también se crea en `contacts` asociado al nuevo cliente.</p>
              </section>
            </aside>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return (
    <dl className="detail-item">
      {icon}
      <div>
        <dt>{label}</dt>
        <dd>{value || "Pendiente"}</dd>
      </div>
    </dl>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <main className="centered-message">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </main>
  );
}

function buildCompanyWarnings(companies: Company[], form: CompanyForm) {
  const warnings: string[] = [];
  const nit = normalizeNit(form.nit);
  const phone = normalizePhone(form.phone);
  const name = normalizeName(form.name);
  const address = normalizeName(form.address);

  if (!nit && !phone && !name && !address) return warnings;

  for (const company of companies) {
    const ref = company.name || "Cliente sin nombre";
    if (nit && normalizeNit(company.nit) === nit) warnings.push(`NIT ya existe: ${ref}`);
    if (phone && normalizePhone(company.phone) === phone) warnings.push(`Teléfono ya existe: ${ref}`);
    if (name && normalizeName(company.name).includes(name)) warnings.push(`Nombre parecido: ${ref}`);
    if (address && normalizeName(company.address).includes(address)) warnings.push(`Dirección similar: ${ref}`);
  }

  return Array.from(new Set(warnings)).slice(0, 8);
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return cleanText(value).toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function normalizeNit(value?: string | null) {
  return (value || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
}

function normalizeName(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
