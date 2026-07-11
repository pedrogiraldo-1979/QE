"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  Building2,
  ClipboardCheck,
  FileQuestion,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Prospect, ProspectList } from "@/lib/types";

type ProspectForm = {
  company_name: string;
  legal_name: string;
  nit: string;
  segment: string;
  city: string;
  website: string;
  phone: string;
  address: string;
  priority: string;
  notes: string;
};

const emptyProspectForm: ProspectForm = {
  company_name: "",
  legal_name: "",
  nit: "",
  segment: "",
  city: "",
  website: "",
  phone: "",
  address: "",
  priority: "B",
  notes: "",
};

export default function NewProspectPage() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [form, setForm] = useState<ProspectForm>(emptyProspectForm);
  const [createdProspect, setCreatedProspect] = useState<Prospect | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(data.session));
      setSessionReady(true);
      if (data.session) void loadLists();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setSessionReady(true);
      if (session) void loadLists();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadLists() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.from("prospect_lists").select("*").order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const loadedLists = (data || []) as ProspectList[];
    setLists(loadedLists);

    const queryListId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("listId") : null;
    const fallbackListId = loadedLists[0]?.id || "";
    setSelectedListId((current) => current || queryListId || fallbackListId);
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

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setLists([]);
    setCreatedProspect(null);
  }

  async function createProspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const companyName = cleanText(form.company_name);
    const selectedList = lists.find((list) => list.id === selectedListId) || null;

    if (!selectedListId) {
      setMessage("Escoge una lista de prospección antes de crear el prospecto.");
      return;
    }

    if (!companyName) {
      setMessage("Agrega el nombre de la empresa prospecto.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setCreatedProspect(null);

    const { data, error } = await supabase
      .from("prospects")
      .insert({
        list_id: selectedListId,
        company_name: companyName,
        legal_name: nullIfBlank(form.legal_name),
        nit: nullIfBlank(form.nit),
        segment: nullIfBlank(form.segment) || selectedList?.segment || null,
        city: nullIfBlank(form.city) || selectedList?.city || null,
        website: nullIfBlank(form.website),
        phone: nullIfBlank(form.phone),
        address: nullIfBlank(form.address),
        priority: nullIfBlank(form.priority) || "B",
        source: selectedList?.source || "app_crm_prospeccion",
        status: "por_revisar",
        notes: nullIfBlank(form.notes),
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setCreatedProspect(data as Prospect);
    setForm(emptyProspectForm);
    setSaving(false);
    setMessage("Prospecto creado para revisión. Puedes abrir la lista para agregar contactos o editarlo.");
  }

  function updateField<K extends keyof ProspectForm>(field: K, value: ProspectForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const selectedList = useMemo(() => lists.find((list) => list.id === selectedListId) || null, [lists, selectedListId]);

  if (!sessionReady) {
    return <CenteredMessage title="Cargando prospección" description="Validando sesión..." />;
  }

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">QE</span>
            <div>
              <p className="eyebrow">Quindío Exquisito</p>
              <h1>Nuevo prospecto</h1>
            </div>
          </div>
          <p className="login-copy">Ingresa para crear prospectos dentro de una lista de prospección.</p>
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
        <div className="sidebar-brand">
          <span className="brand-mark">QE</span>
          <div>
            <p>Quindío Exquisito</p>
            <strong>CRM B2B</strong>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Vistas del CRM">
          <Link className="nav-button" href="/">
            <Home size={18} />
            <span>Inicio</span>
          </Link>
          <Link className="nav-button active" href="/prospectos">
            <Target size={18} />
            <span>Prospección</span>
          </Link>
          <Link className="nav-button" href="/">
            <Building2 size={18} />
            <span>Clientes</span>
          </Link>
          <Link className="nav-button" href="/">
            <UsersRound size={18} />
            <span>Contactos</span>
          </Link>
          <Link className="nav-button" href="/">
            <ActivityIcon size={18} />
            <span>Actividades</span>
          </Link>
          <Link className="nav-button" href="/">
            <ClipboardCheck size={18} />
            <span>Actualización de datos</span>
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-ghost full-width" type="button" onClick={() => void handleSignOut()}>
            <LogOut size={17} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prospección</p>
            <h1>Nuevo prospecto</h1>
          </div>
          <div className="topbar-actions">
            <Link className="btn btn-secondary" href="/prospectos">Volver a listas</Link>
            <button className="btn btn-secondary" type="button" onClick={() => void loadLists()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
          </div>
        </header>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="crm-grid">
          <section className="list-panel">
            <div className="panel-toolbar">
              <div>
                <p className="panel-kicker">Prospecto</p>
                <h2>Crear en lista de prospección</h2>
              </div>
              <span className="result-count">{lists.length}</span>
            </div>

            <form className="activity-form" onSubmit={createProspect}>
              <label className="field-label">
                Lista de prospección
                <select className="select" value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} required>
                  <option value="">Escoge una lista</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <Field label="Nombre empresa" value={form.company_name} onChange={(value) => updateField("company_name", value)} required />
                <Field label="Razón social" value={form.legal_name} onChange={(value) => updateField("legal_name", value)} />
                <Field label="NIT" value={form.nit} onChange={(value) => updateField("nit", value)} />
                <Field label="Segmento" value={form.segment} onChange={(value) => updateField("segment", value)} />
                <Field label="Ciudad" value={form.city} onChange={(value) => updateField("city", value)} />
                <Field label="Teléfono" value={form.phone} onChange={(value) => updateField("phone", value)} />
                <Field label="Website" value={form.website} onChange={(value) => updateField("website", value)} />
                <Field label="Prioridad" value={form.priority} onChange={(value) => updateField("priority", value)} />
              </div>

              <label className="field-label">
                Dirección
                <textarea className="textarea" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
              </label>
              <label className="field-label">
                Notas
                <textarea className="textarea" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </label>

              <div className="panel-actions">
                <Link className="btn btn-secondary" href="/prospectos">Cancelar</Link>
                <button className="btn btn-primary" type="submit" disabled={saving || !lists.length}>
                  <Plus size={17} />
                  {saving ? "Guardando" : "Crear prospecto"}
                </button>
              </div>
            </form>
          </section>

          <aside className="detail-panel">
            <div className="detail-header">
              <div>
                <div className="tag-row">
                  <span className="badge tone-amber">Prospecto nuevo</span>
                  <span className="badge">Estado inicial: por revisar</span>
                </div>
                <h2>{form.company_name || createdProspect?.company_name || "Empresa prospecto"}</h2>
                <p>{selectedList?.name || "Selecciona una lista para guardar el prospecto"}</p>
              </div>
            </div>

            <section className="detail-grid">
              <DetailItem label="Lista" value={selectedList?.name} />
              <DetailItem label="Segmento" value={form.segment || selectedList?.segment} />
              <DetailItem label="Ciudad" value={form.city || selectedList?.city} />
              <DetailItem label="Prioridad" value={form.priority} />
            </section>

            <section className="detail-block">
              <h3>Regla operativa</h3>
              <p>Este flujo crea solo el prospecto en `prospects`. Los contactos se agregan después desde el detalle de la lista. No exporta a Zoho ni genera campañas.</p>
            </section>

            {createdProspect ? (
              <section className="detail-block">
                <h3>Prospecto creado</h3>
                <p>{createdProspect.company_name} quedó listo para revisar dentro de la lista.</p>
                <div className="topbar-actions" style={{ marginTop: 12 }}>
                  <Link className="btn btn-primary" href={`/prospectos/${createdProspect.list_id}`}>
                    Abrir lista
                  </Link>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="field-label">
      {label}
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <dl className="detail-item">
      <FileQuestion size={18} />
      <div>
        <dt>{label}</dt>
        <dd>{value || "Pendiente"}</dd>
      </div>
    </dl>
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

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function nullIfBlank(value: string) {
  const trimmed = cleanText(value);
  return trimmed ? trimmed : null;
}
