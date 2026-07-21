"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Target,
  Trash2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";
import {
  COMPANY_COLUMNS,
  PROSPECT_COLUMNS,
  PROSPECT_CONTACT_COLUMNS,
  PROSPECT_LIST_COLUMNS,
} from "@/lib/data/queryColumns";
import type { Company, Prospect, ProspectContact, ProspectList, ProspectStatus } from "@/lib/types";
import {
  findPossibleCompanyMatches,
  getConversionReadiness,
  getProspectDisplayName,
  isValidEmail,
  normalizeProspectStatus,
  validateProspectContact,
  type CompanyDuplicateMatch,
  type ConversionReadinessItem,
} from "@/lib/prospectOperations";

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

type ContactForm = {
  full_name: string;
  role: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
};

type ReviewTabKey = "todos" | "por_revisar" | "ok_prospecto" | "sin_contacto" | "cliente_actual_excluir";

const cleanStatuses = [
  "nuevo",
  "por_revisar",
  "ok_prospecto",
  "cliente_actual_excluir",
  "sin_contacto",
  "contacto_pendiente",
  "convertido_cliente",
  "descartado",
] as const;

const statusLabels: Record<string, string> = {
  nuevo: "Nuevo",
  por_revisar: "Por revisar",
  por_validar: "Por revisar",
  ok_prospecto: "OK prospecto",
  cliente_actual_excluir: "Cliente actual - excluir",
  sin_contacto: "Sin contacto",
  contacto_pendiente: "Contacto pendiente",
  convertido_cliente: "Convertido a cliente",
  convertido: "Convertido a cliente",
  descartado: "Descartado",
};

const statusTone: Record<string, string> = {
  nuevo: "tone-slate",
  por_revisar: "tone-amber",
  ok_prospecto: "tone-green",
  cliente_actual_excluir: "tone-muted",
  sin_contacto: "tone-amber",
  contacto_pendiente: "tone-blue",
  convertido_cliente: "tone-emerald",
  descartado: "tone-muted",
};

const signalLabels: Record<string, string> = {
  nit: "NIT",
  phone: "teléfono",
  name: "nombre",
  address: "dirección",
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

const emptyContactForm: ContactForm = {
  full_name: "",
  role: "",
  email: "",
  phone: "",
  linkedin_url: "",
  notes: "",
};

export default function ProspectListDetailPage() {
  const params = useParams<{ listId?: string | string[] }>();
  const listId = Array.isArray(params.listId) ? params.listId[0] : params.listId || "";
  const { supabase, sessionReady, isAuthenticated, signIn, signOut } = useCrmSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<ProspectList | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [contacts, setContacts] = useState<ProspectContact[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewTabKey>("todos");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  const [cityFilter, setCityFilter] = useState("todos");
  const [newProspect, setNewProspect] = useState<ProspectForm>(emptyProspectForm);
  const [editProspect, setEditProspect] = useState<ProspectForm>(emptyProspectForm);
  const [newContact, setNewContact] = useState<ContactForm>(emptyContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<ContactForm>(emptyContactForm);
  const [showNewProspect, setShowNewProspect] = useState(false);

  useEffect(() => {
    if (isAuthenticated) void loadData();
  }, [isAuthenticated, listId]);

  const contactsByProspectId = useMemo(() => {
    const map = new Map<string, ProspectContact[]>();
    contacts.forEach((contact) => {
      map.set(contact.prospect_id, [...(map.get(contact.prospect_id) || []), contact]);
    });
    return map;
  }, [contacts]);

  const selectedProspect = useMemo(() => {
    return prospects.find((prospect) => prospect.id === selectedProspectId) || null;
  }, [prospects, selectedProspectId]);

  const selectedContacts = selectedProspect ? contactsByProspectId.get(selectedProspect.id) || [] : [];

  const selectedDuplicateMatches = useMemo(() => {
    if (!selectedProspect) return [];
    return findPossibleCompanyMatches(selectedProspect, companies);
  }, [companies, selectedProspect]);

  const selectedReadiness = useMemo(() => {
    if (!selectedProspect) return [];
    return getConversionReadiness(selectedProspect, selectedContacts, selectedDuplicateMatches);
  }, [selectedContacts, selectedDuplicateMatches, selectedProspect]);

  useEffect(() => {
    if (!selectedProspect) {
      setEditProspect(emptyProspectForm);
      setEditingContactId(null);
      return;
    }

    setEditProspect({
      company_name: selectedProspect.company_name || selectedProspect.name || "",
      legal_name: selectedProspect.legal_name || "",
      nit: selectedProspect.nit || "",
      segment: selectedProspect.segment || "",
      city: selectedProspect.city || "",
      website: selectedProspect.website || "",
      phone: selectedProspect.phone || "",
      address: selectedProspect.address || "",
      priority: selectedProspect.priority || "B",
      notes: selectedProspect.notes || "",
    });
    setEditingContactId(null);
  }, [selectedProspect]);

  async function loadData() {
    if (!listId) return;
    setLoading(true);
    setMessage(null);

    const [listResult, prospectsResult, companiesResult] = await Promise.all([
      supabase.from("prospect_lists").select(PROSPECT_LIST_COLUMNS).eq("id", listId).single(),
      supabase.from("prospects").select(PROSPECT_COLUMNS).eq("list_id", listId).order("company_name", { ascending: true }),
      supabase.from("companies").select(COMPANY_COLUMNS).order("name", { ascending: true }),
    ]);

    if (listResult.error || prospectsResult.error || companiesResult.error) {
      setMessage(listResult.error?.message || prospectsResult.error?.message || companiesResult.error?.message || "No pudimos cargar la lista.");
      setLoading(false);
      return;
    }

    const loadedProspects = (prospectsResult.data || []) as Prospect[];
    const prospectIds = loadedProspects.map((prospect) => prospect.id);
    let loadedContacts: ProspectContact[] = [];

    if (prospectIds.length) {
      const contactsResult = await supabase
        .from("prospect_contacts")
        .select(PROSPECT_CONTACT_COLUMNS)
        .in("prospect_id", prospectIds)
        .order("created_at", { ascending: false });
      if (contactsResult.error) {
        setMessage(contactsResult.error.message);
        setLoading(false);
        return;
      }
      loadedContacts = (contactsResult.data || []) as ProspectContact[];
    }

    setList(listResult.data as ProspectList);
    setCompanies((companiesResult.data || []) as Company[]);
    setProspects(loadedProspects);
    setContacts(loadedContacts);
    setSelectedProspectId((current) => (current && loadedProspects.some((prospect) => prospect.id === current) ? current : loadedProspects[0]?.id || null));
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

  async function handleSignOut() {
    await signOut();
    setProspects([]);
    setContacts([]);
    setCompanies([]);
    setList(null);
  }

  async function createProspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProspect.company_name.trim() || !listId) return;

    const { data, error } = await supabase
      .from("prospects")
      .insert({
        list_id: listId,
        company_name: newProspect.company_name.trim(),
        legal_name: nullIfBlank(newProspect.legal_name),
        nit: nullIfBlank(newProspect.nit),
        segment: nullIfBlank(newProspect.segment),
        city: nullIfBlank(newProspect.city),
        website: nullIfBlank(newProspect.website),
        phone: nullIfBlank(newProspect.phone),
        address: nullIfBlank(newProspect.address),
        priority: nullIfBlank(newProspect.priority) || "B",
        source: list?.source || "app_crm_prospeccion",
        status: "por_revisar",
        notes: nullIfBlank(newProspect.notes),
      })
      .select(PROSPECT_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const inserted = data as Prospect;
    setProspects((current) => [...current, inserted].sort((a, b) => getProspectName(a).localeCompare(getProspectName(b))));
    setSelectedProspectId(inserted.id);
    setStatusFilter("todos");
    setNewProspect(emptyProspectForm);
    setShowNewProspect(false);
    setMessage("Prospecto creado para revisión.");
  }

  async function updateSelectedProspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProspect || !editProspect.company_name.trim()) return;

    const payload = {
      company_name: editProspect.company_name.trim(),
      legal_name: nullIfBlank(editProspect.legal_name),
      nit: nullIfBlank(editProspect.nit),
      segment: nullIfBlank(editProspect.segment),
      city: nullIfBlank(editProspect.city),
      website: nullIfBlank(editProspect.website),
      phone: nullIfBlank(editProspect.phone),
      address: nullIfBlank(editProspect.address),
      priority: nullIfBlank(editProspect.priority) || "B",
      notes: nullIfBlank(editProspect.notes),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("prospects")
      .update(payload)
      .eq("id", selectedProspect.id)
      .select(PROSPECT_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const updated = data as Prospect;
    setProspects((current) => current.map((prospect) => (prospect.id === updated.id ? updated : prospect)));
    setMessage("Prospecto actualizado.");
  }

  async function updateProspectStatus(prospect: Prospect, status: ProspectStatus) {
    const { data, error } = await supabase
      .from("prospects")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", prospect.id)
      .select(PROSPECT_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const updated = data as Prospect;
    setProspects((current) => current.map((item) => (item.id === prospect.id ? updated : item)));
    setMessage(`Estado actualizado: ${statusLabels[status] || status}.`);
  }

  async function deleteSelectedProspect() {
    if (!selectedProspect) return;

    const prospectName = getProspectName(selectedProspect);
    const confirmed = window.confirm(
      `¿Eliminar el prospecto ${prospectName}? Esta acción borra solo la empresa prospecto y sus contactos prospecto. No toca clientes CRM ni contactos CRM reales.`
    );

    if (!confirmed) return;

    const prospectId = selectedProspect.id;
    const { error } = await supabase.rpc("delete_prospect", { p_prospect_id: prospectId });

    if (error) {
      setMessage(error.message);
      return;
    }

    const remainingProspects = prospects.filter((prospect) => prospect.id !== prospectId);
    setProspects(remainingProspects);
    setContacts((current) => current.filter((contact) => contact.prospect_id !== prospectId));
    setSelectedProspectId(remainingProspects[0]?.id || null);
    setEditingContactId(null);
    setMessage(`Prospecto eliminado: ${prospectName}.`);
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProspect || !newContact.full_name.trim()) return;

    const { data, error } = await supabase
      .from("prospect_contacts")
      .insert({
        prospect_id: selectedProspect.id,
        full_name: newContact.full_name.trim(),
        role: nullIfBlank(newContact.role),
        email: normalizeEmail(newContact.email),
        phone: nullIfBlank(newContact.phone),
        linkedin_url: nullIfBlank(newContact.linkedin_url),
        notes: nullIfBlank(newContact.notes),
      })
      .select(PROSPECT_CONTACT_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setContacts((current) => [data as ProspectContact, ...current]);
    setNewContact(emptyContactForm);
    setMessage("Contacto prospecto agregado.");
  }

  function startEditingContact(contact: ProspectContact) {
    setEditingContactId(contact.id);
    setEditContact({
      full_name: contact.full_name || "",
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedin_url: contact.linkedin_url || "",
      notes: contact.notes || "",
    });
  }

  async function updateContact(event: FormEvent<HTMLFormElement>, contact: ProspectContact) {
    event.preventDefault();
    if (!editContact.full_name.trim()) return;

    const { data, error } = await supabase
      .from("prospect_contacts")
      .update({
        full_name: editContact.full_name.trim(),
        role: nullIfBlank(editContact.role),
        email: normalizeEmail(editContact.email),
        phone: nullIfBlank(editContact.phone),
        linkedin_url: nullIfBlank(editContact.linkedin_url),
        notes: nullIfBlank(editContact.notes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id)
      .select(PROSPECT_CONTACT_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const updated = data as ProspectContact;
    setContacts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setEditingContactId(null);
    setEditContact(emptyContactForm);
    setMessage("Contacto prospecto actualizado.");
  }

  async function deleteContact(contact: ProspectContact) {
    const confirmed = window.confirm(`¿Eliminar el contacto prospecto ${contact.full_name || "sin nombre"}? Esta acción solo borra el contacto prospecto, no clientes CRM.`);
    if (!confirmed) return;

    const { error } = await supabase.from("prospect_contacts").delete().eq("id", contact.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setContacts((current) => current.filter((item) => item.id !== contact.id));
    if (editingContactId === contact.id) setEditingContactId(null);
    setMessage("Contacto prospecto eliminado.");
  }

  const normalizedSearch = search.trim().toLowerCase();
  const cities = useMemo(() => Array.from(new Set(prospects.map((prospect) => prospect.city).filter(Boolean) as string[])).sort(), [prospects]);
  const priorities = useMemo(() => Array.from(new Set(prospects.map((prospect) => prospect.priority).filter(Boolean) as string[])).sort(), [prospects]);

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const prospectContacts = contactsByProspectId.get(prospect.id) || [];
      const matchesSearch =
        !normalizedSearch ||
        [
          getProspectName(prospect),
          prospect.legal_name,
          prospect.nit,
          prospect.phone,
          prospect.city,
          prospect.segment,
          prospect.address,
          ...prospectContacts.flatMap((contact) => [contact.full_name, contact.email, contact.phone, contact.role]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesStatus = matchesReviewTab(prospect, prospectContacts, statusFilter);
      const matchesPriority = priorityFilter === "todos" || prospect.priority === priorityFilter;
      const matchesCity = cityFilter === "todos" || prospect.city === cityFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCity;
    });
  }, [cityFilter, contactsByProspectId, normalizedSearch, priorityFilter, prospects, statusFilter]);

  const withContacts = prospects.filter((prospect) => (contactsByProspectId.get(prospect.id) || []).length).length;
  const withValidEmail = prospects.filter((prospect) => (contactsByProspectId.get(prospect.id) || []).some((contact) => isValidEmail(contact.email))).length;
  const okProspects = prospects.filter((prospect) => normalizeProspectStatus(prospect.status) === "ok_prospecto").length;
  const excluded = prospects.filter((prospect) => normalizeProspectStatus(prospect.status) === "cliente_actual_excluir").length;
  const porRevisar = prospects.filter((prospect) => normalizeProspectStatus(prospect.status) === "por_revisar").length;
  const sinContacto = prospects.filter((prospect) => (contactsByProspectId.get(prospect.id) || []).length === 0).length;

  const reviewTabs: { key: ReviewTabKey; label: string; helper: string; count: number }[] = [
    { key: "todos", label: "Todos", helper: "lista completa", count: prospects.length },
    { key: "por_revisar", label: "Por revisar", helper: "pendientes", count: porRevisar },
    { key: "ok_prospecto", label: "OK prospecto", helper: "aptos", count: okProspects },
    { key: "sin_contacto", label: "Sin contacto", helper: "faltan datos", count: sinContacto },
    { key: "cliente_actual_excluir", label: "Excluidos", helper: "no trabajar", count: excluded },
  ];

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
              <h1>Prospección B2B</h1>
            </div>
          </div>
          <p className="login-copy">Ingresa para revisar prospectos y contactos antes de cualquier campaña o envío.</p>
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
          <button aria-label="Salir" className="btn btn-ghost full-width" type="button" onClick={() => void handleSignOut()}>
            <LogOut size={17} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prospección</p>
            <h1>{list?.name || "Detalle de lista"}</h1>
          </div>
          <div className="topbar-actions">
            <Link className="btn btn-secondary" href="/prospectos">Volver a listas</Link>
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setShowNewProspect((current) => !current)}>
              <Plus size={17} />
              Nuevo prospecto
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Indicadores de lista">
          <MetricCard icon={Building2} label="Prospectos" value={prospects.length} helper="empresas en lista" />
          <MetricCard icon={CheckCircle2} label="OK prospecto" value={okProspects} helper="aptos para trabajar" />
          <MetricCard icon={UsersRound} label="Con contacto" value={withContacts} helper="al menos una persona" />
          <MetricCard icon={Mail} label="Email válido" value={withValidEmail} helper="no exporta todavía" />
          <MetricCard icon={FileQuestion} label="Excluir" value={excluded} helper="cliente actual u otro motivo" />
        </section>

        {message ? <section className="alert alert-info">{message}</section> : null}

        {showNewProspect ? (
          <section className="home-panel">
            <div className="section-title-row">
              <h3>Crear prospecto en esta lista</h3>
              <button className="btn btn-secondary compact" type="button" onClick={() => setShowNewProspect(false)}>Cerrar</button>
            </div>
            <ProspectFormFields form={newProspect} setForm={setNewProspect} onSubmit={createProspect} submitLabel="Crear prospecto" />
          </section>
        ) : null}

        <section className="crm-grid">
          <section className="list-panel">
            <div className="panel-toolbar">
              <div>
                <p className="panel-kicker">Empresas prospecto</p>
                <h2>Panel de revisión</h2>
              </div>
              <span className="result-count">{filteredProspects.length}</span>
            </div>

            <div className="prospect-tabs" role="tablist" aria-label="Estados de trabajo">
              {reviewTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.key}
                  className={`prospect-tab ${statusFilter === tab.key ? "active" : ""}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  <span>{tab.label}</span>
                  <strong>{tab.count}</strong>
                  <small>{tab.helper}</small>
                </button>
              ))}
            </div>

            <div className="filters-row filters-row-workbench">
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label="Buscar prospecto en la lista"
                  placeholder="Buscar por nombre, NIT, teléfono o contacto"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="select-shell">
                <Tag size={16} />
                <select aria-label="Filtrar prospectos por prioridad" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="todos">Prioridad</option>
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="select-shell">
                <LayoutDashboard size={16} />
                <select aria-label="Filtrar prospectos por ciudad" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
                  <option value="todos">Ciudad</option>
                  {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
              {(search || priorityFilter !== "todos" || cityFilter !== "todos" || statusFilter !== "todos") ? (
                <button className="btn btn-secondary compact" type="button" onClick={() => { setSearch(""); setPriorityFilter("todos"); setCityFilter("todos"); setStatusFilter("todos"); }}>
                  Limpiar
                </button>
              ) : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Prospecto</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Ciudad</th>
                    <th>Teléfono</th>
                    <th>Contactos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.map((prospect) => {
                    const prospectContacts = contactsByProspectId.get(prospect.id) || [];
                    const normalizedStatus = normalizeProspectStatus(prospect.status);
                    return (
                      <tr key={prospect.id} className={selectedProspectId === prospect.id ? "selected" : ""} onClick={() => setSelectedProspectId(prospect.id)}>
                        <td>
                          <strong>{getProspectName(prospect)}</strong>
                          <span>{prospect.nit || prospect.legal_name || "Datos legales pendientes"}</span>
                        </td>
                        <td><StatusBadge status={prospect.status} /></td>
                        <td>{prospect.priority || "B"}</td>
                        <td>{prospect.city || "-"}</td>
                        <td>{prospect.phone || "-"}</td>
                        <td>
                          <strong>{prospectContacts.length}</strong>
                          <span>{prospectContacts.some((contact) => isValidEmail(contact.email)) ? "email válido" : "sin email válido"}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-secondary compact" type="button" onClick={(event) => { event.stopPropagation(); setSelectedProspectId(prospect.id); }}>
                              Ver datos
                            </button>
                            <button className="btn btn-primary compact" type="button" disabled={normalizedStatus === "ok_prospecto"} onClick={(event) => { event.stopPropagation(); void updateProspectStatus(prospect, "ok_prospecto"); }}>
                              OK prospecto
                            </button>
                            <button className="btn btn-secondary compact" type="button" onClick={(event) => { event.stopPropagation(); void updateProspectStatus(prospect, "cliente_actual_excluir"); }}>
                              Excluir actual
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredProspects.length ? <EmptyState title="Sin prospectos" description="No hay empresas prospecto con esos filtros." /> : null}
            </div>
          </section>

          <aside className="detail-panel">
            {selectedProspect ? (
              <>
                <div className="detail-header">
                  <div>
                    <div className="tag-row">
                      <span className="badge tone-blue">Prospecto</span>
                      <StatusBadge status={selectedProspect.status} />
                      <span className="badge">Prioridad {selectedProspect.priority || "B"}</span>
                    </div>
                    <h2>{getProspectName(selectedProspect)}</h2>
                    <p>{selectedProspect.segment || list?.segment || "Segmento pendiente"}</p>
                  </div>
                  <label className="status-select">
                    Estado de revisión
                    <select value={normalizeProspectStatus(selectedProspect.status)} onChange={(event) => void updateProspectStatus(selectedProspect, event.target.value as ProspectStatus)}>
                      {cleanStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </label>
                </div>

                <section className="detail-section">
                  <div className="section-title-row">
                    <h3>Acciones del prospecto</h3>
                  </div>
                  <button className="btn btn-secondary full-width" type="button" onClick={() => void deleteSelectedProspect()}>
                    <Trash2 size={17} />
                    Eliminar prospecto
                  </button>
                  <p className="helper-text">Borra solo esta empresa prospecto y sus contactos prospecto. No toca clientes CRM.</p>
                </section>

                <QualityPanel matches={selectedDuplicateMatches} readiness={selectedReadiness} />

                <section className="detail-section">
                  <div className="section-title-row">
                    <h3>Editar empresa prospecto</h3>
                  </div>
                  <ProspectFormFields form={editProspect} setForm={setEditProspect} onSubmit={updateSelectedProspect} submitLabel="Guardar cambios" compact />
                </section>

                <section className="detail-section">
                  <div className="section-title-row">
                    <h3>Contactos prospecto</h3>
                    <span>{selectedContacts.length}</span>
                  </div>
                  <div className="stack">
                    {selectedContacts.length ? selectedContacts.map((contact) => (
                      <EditableProspectContactCard
                        key={contact.id}
                        contact={contact}
                        isEditing={editingContactId === contact.id}
                        editContact={editContact}
                        setEditContact={setEditContact}
                        onStartEdit={() => startEditingContact(contact)}
                        onCancelEdit={() => { setEditingContactId(null); setEditContact(emptyContactForm); }}
                        onSave={(event) => void updateContact(event, contact)}
                        onDelete={() => void deleteContact(contact)}
                      />
                    )) : <EmptyState title="Sin contactos" description="Agrega compras, rectoría, administración o persona operativa." />}
                  </div>
                </section>

                <section className="detail-section">
                  <div className="section-title-row">
                    <h3>Agregar contacto prospecto</h3>
                  </div>
                  <form className="activity-form" onSubmit={addContact}>
                    <div className="form-grid">
                      <Field label="Nombre" value={newContact.full_name} onChange={(value) => setNewContact((current) => ({ ...current, full_name: value }))} required />
                      <Field label="Cargo" value={newContact.role} onChange={(value) => setNewContact((current) => ({ ...current, role: value }))} />
                      <Field label="Email" value={newContact.email} onChange={(value) => setNewContact((current) => ({ ...current, email: value }))} />
                      <Field label="Teléfono" value={newContact.phone} onChange={(value) => setNewContact((current) => ({ ...current, phone: value }))} />
                      <Field label="LinkedIn" value={newContact.linkedin_url} onChange={(value) => setNewContact((current) => ({ ...current, linkedin_url: value }))} />
                      <Field label="Notas" value={newContact.notes} onChange={(value) => setNewContact((current) => ({ ...current, notes: value }))} />
                    </div>
                    <div className="panel-actions">
                      <button className="btn btn-primary" type="submit"><Plus size={17} />Agregar contacto</button>
                    </div>
                  </form>
                </section>

                <section className="detail-section">
                  <div className="section-title-row">
                    <h3>Conversión futura</h3>
                  </div>
                  <button className="btn btn-secondary full-width" type="button" disabled>
                    Convertir a cliente CRM - pendiente
                  </button>
                </section>
              </>
            ) : (
              <CenteredMessage title="Sin selección" description="Selecciona una empresa prospecto para revisar o editar." />
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

function ProspectFormFields({
  form,
  setForm,
  onSubmit,
  submitLabel,
  compact = false,
}: {
  form: ProspectForm;
  setForm: (updater: ProspectForm | ((current: ProspectForm) => ProspectForm)) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  compact?: boolean;
}) {
  return (
    <form className="activity-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <Field label="Nombre empresa" value={form.company_name} onChange={(value) => setForm((current) => ({ ...current, company_name: value }))} required />
        <Field label="Razón social" value={form.legal_name} onChange={(value) => setForm((current) => ({ ...current, legal_name: value }))} />
        <Field label="NIT" value={form.nit} onChange={(value) => setForm((current) => ({ ...current, nit: value }))} />
        <Field label="Segmento" value={form.segment} onChange={(value) => setForm((current) => ({ ...current, segment: value }))} />
        <Field label="Ciudad" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
        <Field label="Teléfono" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <Field label="Website" value={form.website} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
        <Field label="Prioridad" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} />
      </div>
      <label className="field-label">
        Dirección
        <textarea className="textarea" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
      </label>
      <label className="field-label">
        Notas
        <textarea className="textarea" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </label>
      <div className="panel-actions">
        <button className="btn btn-primary" type="submit">{compact ? submitLabel : <><Plus size={17} />{submitLabel}</>}</button>
      </div>
    </form>
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

function EditableProspectContactCard({
  contact,
  isEditing,
  editContact,
  setEditContact,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  contact: ProspectContact;
  isEditing: boolean;
  editContact: ContactForm;
  setEditContact: (updater: ContactForm | ((current: ContactForm) => ContactForm)) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  const validation = validateProspectContact(contact);

  if (isEditing) {
    return (
      <article className="contact-card needs-data">
        <form className="form-stack" onSubmit={onSave}>
          <div className="section-title-row">
            <h4>Editar contacto</h4>
            <button className="btn btn-secondary compact" type="button" onClick={onCancelEdit}><X size={14} />Cerrar</button>
          </div>
          <div className="form-grid">
            <Field label="Nombre" value={editContact.full_name} onChange={(value) => setEditContact((current) => ({ ...current, full_name: value }))} required />
            <Field label="Cargo" value={editContact.role} onChange={(value) => setEditContact((current) => ({ ...current, role: value }))} />
            <Field label="Email" value={editContact.email} onChange={(value) => setEditContact((current) => ({ ...current, email: value }))} />
            <Field label="Teléfono" value={editContact.phone} onChange={(value) => setEditContact((current) => ({ ...current, phone: value }))} />
            <Field label="LinkedIn" value={editContact.linkedin_url} onChange={(value) => setEditContact((current) => ({ ...current, linkedin_url: value }))} />
            <Field label="Notas" value={editContact.notes} onChange={(value) => setEditContact((current) => ({ ...current, notes: value }))} />
          </div>
          <div className="panel-actions">
            <button className="btn btn-primary" type="submit">Guardar contacto</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className={`contact-card ${validation.crmValid ? "" : "needs-data"}`}>
      <div className="avatar"><UserRound size={17} /></div>
      <div>
        <div className="section-title-row">
          <div>
            <h4>{contact.full_name || "Contacto sin nombre"}</h4>
            <p>{contact.role || "Cargo pendiente"}</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-secondary compact" type="button" onClick={onStartEdit}><Pencil size={14} />Editar</button>
            <button className="btn btn-secondary compact" type="button" onClick={onDelete}><Trash2 size={14} />Eliminar</button>
          </div>
        </div>
        <div className="contact-links">
          {contact.email ? <a href={`mailto:${contact.email}`}><Mail size={14} />{contact.email}</a> : <span>Sin email</span>}
          {contact.phone ? <a href={`tel:${contact.phone}`}><Phone size={14} />{contact.phone}</a> : <span>Sin teléfono</span>}
        </div>
        <div className="issue-row" style={{ marginTop: 9 }}>
          <span className={validation.crmValid ? "ok-badge" : "issue-badge"}>Validez CRM: {validation.crmValid ? "útil" : "incompleta"}</span>
          <span className={validation.campaignValid ? "ok-badge" : "issue-badge"}>Campaña futura: {validation.campaignValid ? "email válido" : "no exportar todavía"}</span>
        </div>
        {validation.missing.length ? <p>Falta: {validation.missing.join(", ")}.</p> : null}
        {contact.notes ? <p>{contact.notes}</p> : null}
      </div>
    </article>
  );
}

function QualityPanel({ matches, readiness }: { matches: CompanyDuplicateMatch[]; readiness: ConversionReadinessItem[] }) {
  return (
    <section className="detail-section">
      <div className="section-title-row">
        <h3>Control operativo</h3>
      </div>
      {matches.length ? (
        <div className="alert alert-info">
          <div className="issue-row">
            <AlertTriangle size={17} />
            <strong>Posible cliente actual</strong>
          </div>
          <p>Revisa antes de trabajar este prospecto. Coincidencias encontradas:</p>
          <div className="stack">
            {matches.map((match) => (
              <div key={match.company.id || match.company.name || "match"} className="contact-card needs-data">
                <div>
                  <h4>{match.company.name || match.company.legal_name || "Cliente sin nombre"}</h4>
                  <p>{[match.company.nit, match.company.phone, match.company.status].filter(Boolean).join(" · ") || "Datos parciales"}</p>
                  <div className="issue-row">
                    {match.signals.map((signal) => <span key={signal} className="issue-badge">Coincide {signalLabels[signal] || signal}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="alert alert-info">Sin coincidencias evidentes contra clientes actuales.</div>
      )}
      <div className="stack" style={{ marginTop: 12 }}>
        {readiness.map((item) => (
          <div key={item.key} className="issue-row">
            <span className={item.ok ? "ok-badge" : "issue-badge"}>{item.ok ? "OK" : "Pendiente"}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeProspectStatus(status);
  return <span className={`badge ${statusTone[normalized] || "tone-slate"}`}>{statusLabels[normalized] || status || "Nuevo"}</span>;
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: number; helper: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon"><Icon size={18} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <FileQuestion size={18} />
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

function getProspectName(prospect: Prospect) {
  return getProspectDisplayName(prospect);
}

function matchesReviewTab(prospect: Prospect, contacts: ProspectContact[], tab: ReviewTabKey) {
  if (tab === "todos") return true;
  if (tab === "sin_contacto") return contacts.length === 0;
  return normalizeProspectStatus(prospect.status) === tab;
}

function nullIfBlank(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
