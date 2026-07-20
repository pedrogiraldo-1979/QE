"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FileQuestion,
  Filter,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Target,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";
import { useCrmDashboardData } from "@/hooks/useCrmDashboardData";
import { HomePanel } from "@/components/crm/HomePanel";
import { MetricCard } from "@/components/crm/MetricCard";
import { NavButton } from "@/components/crm/NavButton";
import { ActivitiesTable } from "@/components/crm/ActivitiesTable";
import { CompanyTable } from "@/components/crm/CompanyTable";
import { ContactsTable } from "@/components/crm/ContactsTable";
import { CustomerResponsesTable } from "@/components/crm/CustomerResponsesTable";
import { DataIssuesTable } from "@/components/crm/DataIssuesTable";
import { ProspectsTable } from "@/components/crm/ProspectsTable";
import {
  activityTypeLabels,
  buildConvertedProspectNotes,
  countByStatus,
  filterCustomerResponses,
  filterDataIssues,
  formatActivityType,
  formatContactRole,
  getCompanyIssues,
  getContactIssues,
  getNextActivity,
  getPageTitle,
  getResultCount,
  getSearchPlaceholder,
  getViewHeading,
  getViewTitle,
  isInFollowUp,
  isOverdue,
  normalizeStatus,
  normalizeUrl,
  prospectStatusLabels,
  prospectStatusTone,
  statusLabels,
  statusTone,
  type DataIssueGroup,
  type DataTab,
  type ViewMode,
} from "@/features/crm/dashboardModel";
import {
  getProspectDisplayName,
  isConvertedProspect,
  normalizeProspectStatus,
} from "@/lib/prospectOperations";
import { ACTIVITY_COLUMNS, PROSPECT_ACTIVITY_COLUMNS } from "@/lib/data/queryColumns";
import {
  ACTIVITY_TYPES,
  COMPANY_STATUSES,
  PROSPECT_STATUSES,
  type Activity,
  type ActivityType,
  type Company,
  type CompanyStatus,
  type Contact,
  type Prospect,
  type ProspectActivity,
} from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { supabase, sessionReady, isAuthenticated, signIn, signOut } = useCrmSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const {
    data,
    setData,
    loading,
    message,
    setMessage,
    customerResponses,
    customerResponsesLoading,
    customerResponsesError,
    processingResponseId,
    loadData,
    loadCustomerResponses,
    reviewCustomerResponse,
    resetData,
  } = useCrmDashboardData(supabase, isAuthenticated);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProspectActivityId, setSelectedProspectActivityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dataTab, setDataTab] = useState<DataTab>("pending");
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityType, setNewActivityType] = useState<ActivityType>("follow_up");
  const [newActivityDueDate, setNewActivityDueDate] = useState("");
  const [prospectActivityPanelOpen, setProspectActivityPanelOpen] = useState(false);
  const [newProspectActivityNotes, setNewProspectActivityNotes] = useState("");
  const [newProspectActivityType, setNewProspectActivityType] = useState<ActivityType>("follow_up");
  const [newProspectActivityDueDate, setNewProspectActivityDueDate] = useState("");
  const [convertingProspectId, setConvertingProspectId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCompanyId((current) => (current && data.companies.some((company) => company.id === current) ? current : null));
    setSelectedActivityId((current) => (current && data.activities.some((activity) => activity.id === current) ? current : null));
    setSelectedProspectId((current) => (current && data.prospects.some((prospect) => prospect.id === current) ? current : null));
    setSelectedProspectActivityId((current) =>
      current && data.prospectActivities.some((activity) => activity.id === current) ? current : null,
    );
  }, [data]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const error = await signIn(email, password);

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    resetData();
    setSelectedCompanyId(null);
    setSelectedActivityId(null);
    setSelectedProspectId(null);
    setSelectedProspectActivityId(null);
  }

  async function updateCompanyStatus(company: Company, status: CompanyStatus) {
    const { error } = await supabase
      .from("companies")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", company.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      companies: current.companies.map((item) => (item.id === company.id ? { ...item, status } : item)),
    }));
    setMessage("Estado comercial actualizado.");
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany || !newActivityNotes.trim()) return;

    const { data: inserted, error } = await supabase
      .from("activities")
      .insert({
        company_id: selectedCompany.id,
        activity_type: newActivityType,
        notes: newActivityNotes.trim(),
        due_date: newActivityDueDate || null,
      })
      .select(ACTIVITY_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const activity = inserted as Activity;
    setData((current) => ({
      ...current,
      activities: [activity, ...current.activities],
    }));
    setSelectedActivityId(activity.id);
    setNewActivityNotes("");
    setNewActivityDueDate("");
    setNewActivityType("follow_up");
    setActivityPanelOpen(false);
    setMessage("Seguimiento creado.");
  }

  async function toggleActivityCompleted(activity: Activity) {
    const completed = !activity.completed;
    const { error } = await supabase.from("activities").update({ completed }).eq("id", activity.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      activities: current.activities.map((item) => (item.id === activity.id ? { ...item, completed } : item)),
    }));
    setMessage(completed ? "Seguimiento completado." : "Seguimiento reabierto.");
  }

  async function addProspectActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProspect || !newProspectActivityNotes.trim()) return;

    const { data: inserted, error } = await supabase
      .from("prospect_activities")
      .insert({
        prospect_id: selectedProspect.id,
        activity_type: newProspectActivityType,
        notes: newProspectActivityNotes.trim(),
        due_date: newProspectActivityDueDate || null,
      })
      .select(PROSPECT_ACTIVITY_COLUMNS)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    const activity = inserted as ProspectActivity;
    setData((current) => ({
      ...current,
      prospectActivities: [activity, ...current.prospectActivities],
    }));
    setSelectedProspectActivityId(activity.id);
    setNewProspectActivityNotes("");
    setNewProspectActivityDueDate("");
    setNewProspectActivityType("follow_up");
    setProspectActivityPanelOpen(false);
    setMessage("Actividad de prospeccion creada.");
  }

  async function toggleProspectActivityCompleted(activity: ProspectActivity) {
    const completed = !activity.completed;
    const { error } = await supabase.from("prospect_activities").update({ completed }).eq("id", activity.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      prospectActivities: current.prospectActivities.map((item) => (item.id === activity.id ? { ...item, completed } : item)),
    }));
    setMessage(completed ? "Actividad de prospeccion completada." : "Actividad de prospeccion reabierta.");
  }

  async function convertProspectToCustomer(prospect: Prospect) {
    if (isConvertedProspect(prospect)) return;

    setConvertingProspectId(prospect.id);
    setMessage(null);

    const { data: converted, error } = await supabase.rpc("convert_prospect_to_company", {
      p_prospect_id: prospect.id,
      p_notes: buildConvertedProspectNotes(prospect),
    });

    if (error) {
      setMessage(error.message);
      setConvertingProspectId(null);
      return;
    }

    const company = (Array.isArray(converted) ? converted[0] : converted) as Company | null;
    if (!company) {
      setMessage("No se pudo recuperar la empresa convertida.");
      setConvertingProspectId(null);
      return;
    }

    setData((current) => ({
      ...current,
      companies: (current.companies.some((item) => item.id === company.id)
        ? current.companies
        : [...current.companies, company]
      ).sort((a, b) => a.name.localeCompare(b.name)),
      prospects: current.prospects.map((item) =>
        item.id === prospect.id ? { ...item, status: "convertido_cliente", converted_company_id: company.id } : item
      ),
    }));
    setSelectedCompanyId(company.id);
    setSelectedActivityId(null);
    setSelectedProspectId(null);
    setSelectedProspectActivityId(null);
    setConvertingProspectId(null);
    setViewMode("companies");
    setMessage("Prospecto convertido a cliente.");
  }

  const companyById = useMemo(() => {
    return new Map(data.companies.map((company) => [company.id, company]));
  }, [data.companies]);

  const contactsByCompanyId = useMemo(() => {
    const map = new Map<string, Contact[]>();
    data.contacts.forEach((contact) => {
      if (!contact.company_id) return;
      map.set(contact.company_id, [...(map.get(contact.company_id) || []), contact]);
    });
    return map;
  }, [data.contacts]);

  const activitiesByCompanyId = useMemo(() => {
    const map = new Map<string, Activity[]>();
    data.activities.forEach((activity) => {
      if (!activity.company_id) return;
      map.set(activity.company_id, [...(map.get(activity.company_id) || []), activity]);
    });
    return map;
  }, [data.activities]);

  const prospectActivitiesByProspectId = useMemo(() => {
    const map = new Map<string, ProspectActivity[]>();
    data.prospectActivities.forEach((activity) => {
      if (!activity.prospect_id) return;
      map.set(activity.prospect_id, [...(map.get(activity.prospect_id) || []), activity]);
    });
    return map;
  }, [data.prospectActivities]);

  const segments = useMemo(() => {
    return Array.from(new Set(data.companies.map((company) => company.segment).filter(Boolean) as string[])).sort();
  }, [data.companies]);

  const prospectSegments = useMemo(() => {
    return Array.from(new Set(data.prospects.map((prospect) => prospect.segment).filter(Boolean) as string[])).sort();
  }, [data.prospects]);

  const selectedActivity = useMemo(() => {
    return data.activities.find((activity) => activity.id === selectedActivityId) || null;
  }, [data.activities, selectedActivityId]);

  const selectedCompany = useMemo(() => {
    if (selectedActivity?.company_id) return companyById.get(selectedActivity.company_id) || null;
    if (selectedCompanyId) return companyById.get(selectedCompanyId) || null;
    return null;
  }, [companyById, selectedActivity, selectedCompanyId]);

  const selectedProspectActivity = useMemo(() => {
    return data.prospectActivities.find((activity) => activity.id === selectedProspectActivityId) || null;
  }, [data.prospectActivities, selectedProspectActivityId]);

  const selectedProspect = useMemo(() => {
    if (selectedProspectActivity?.prospect_id) {
      return data.prospects.find((prospect) => prospect.id === selectedProspectActivity.prospect_id) || null;
    }
    if (selectedProspectId) return data.prospects.find((prospect) => prospect.id === selectedProspectId) || null;
    return null;
  }, [data.prospects, selectedProspectActivity, selectedProspectId]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCompanies = useMemo(() => {
    return data.companies.filter((company) => {
      const matchesSearch =
        !normalizedSearch ||
        [company.name, company.legal_name, company.nit, company.city, company.address, company.phone, company.segment]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesSegment = segmentFilter === "todos" || company.segment === segmentFilter;
      const matchesStatus = statusFilter === "todos" || normalizeStatus(company.status) === statusFilter;

      return matchesSearch && matchesSegment && matchesStatus;
    });
  }, [data.companies, normalizedSearch, segmentFilter, statusFilter]);

  const filteredProspects = useMemo(() => {
    return data.prospects.filter((prospect) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          getProspectDisplayName(prospect),
          prospect.legal_name,
          prospect.nit,
          prospect.city,
          prospect.address,
          prospect.phone,
          prospect.segment,
          prospect.contact_name,
          prospect.contact_email,
          prospect.source,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesSegment = segmentFilter === "todos" || prospect.segment === segmentFilter;
      const matchesStatus = statusFilter === "todos" || normalizeProspectStatus(prospect.status) === statusFilter;

      return matchesSearch && matchesSegment && matchesStatus;
    });
  }, [data.prospects, normalizedSearch, segmentFilter, statusFilter]);

  const filteredContacts = useMemo(() => {
    return data.contacts.filter((contact) => {
      if (!normalizedSearch) return true;
      return [contact.full_name, contact.company_name, contact.role, contact.email, contact.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [data.contacts, normalizedSearch]);

  const filteredActivities = useMemo(() => {
    return data.activities.filter((activity) => {
      if (!normalizedSearch) return true;
      const company = activity.company_id ? companyById.get(activity.company_id) : null;
      return [company?.name, company?.segment, activity.activity_type, activity.notes, activity.due_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [companyById, data.activities, normalizedSearch]);

  const dataIssueGroups = useMemo(() => {
    const companyIssues: DataIssueGroup[] = data.companies
      .map((company) => ({ company, issues: getCompanyIssues(company) }))
      .filter(({ issues }) => issues.length)
      .map((company) => ({
        id: `company-${company.company.id}`,
        type: "company",
        title: company.company.name,
        subtitle: company.company.segment || company.company.city || "Cliente",
        issues: company.issues,
        companyId: company.company.id,
      }));

    const contactIssues: DataIssueGroup[] = data.contacts
      .map((contact) => ({ contact, issues: getContactIssues(contact) }))
      .filter(({ issues }) => issues.length)
      .map(({ contact, issues }) => ({
        id: `contact-${contact.id}`,
        type: "contact",
        title: contact.full_name || "Contacto sin nombre",
        subtitle: contact.company_name || "Cliente pendiente",
        issues,
        companyId: contact.company_id,
      }));

    return [...companyIssues, ...contactIssues];
  }, [data.companies, data.contacts]);

  const filteredDataIssues = useMemo(() => {
    return filterDataIssues(dataIssueGroups, normalizedSearch);
  }, [dataIssueGroups, normalizedSearch]);

  const filteredCustomerResponses = useMemo(() => {
    return filterCustomerResponses(customerResponses, normalizedSearch);
  }, [customerResponses, normalizedSearch]);

  const selectedContacts = selectedCompany ? contactsByCompanyId.get(selectedCompany.id) || [] : [];
  const selectedActivities = selectedCompany ? activitiesByCompanyId.get(selectedCompany.id) || [] : [];
  const nextActivity = getNextActivity(selectedActivities);
  const selectedProspectActivities = selectedProspect ? prospectActivitiesByProspectId.get(selectedProspect.id) || [] : [];
  const nextProspectActivity = getNextActivity(selectedProspectActivities);

  const inFollowUpCount = data.companies.filter(isInFollowUp).length;
  const activeProspectsCount = data.prospects.filter(
    (prospect) => !["convertido_cliente", "descartado"].includes(normalizeProspectStatus(prospect.status))
  ).length;
  const unclassifiedCount = data.companies.filter((company) => normalizeStatus(company.status) === "nuevo").length;
  const overdueActivities = data.activities.filter((activity) => isOverdue(activity)).length;
  const overdueProspectActivities = data.prospectActivities.filter((activity) => isOverdue(activity)).length;
  const contactsWithoutEmail = data.contacts.filter((contact) => !contact.email?.trim()).length;
  const rolesPending = data.contacts.filter((contact) => !contact.role?.trim()).length;
  const dataToValidateCount = dataIssueGroups.length;
  const hasDetailPanel = viewMode === "prospecting" ? Boolean(selectedProspect) : Boolean(selectedCompany);

  const handleCompanySelect = (id: string) => {
    setSelectedCompanyId(id);
    setSelectedActivityId(null);
    setSelectedProspectId(null);
    setSelectedProspectActivityId(null);
  };

  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivityId(activity.id);
    setSelectedCompanyId(activity.company_id || null);
    setSelectedProspectId(null);
    setSelectedProspectActivityId(null);
  };

  const handleProspectSelect = (id: string) => {
    setSelectedProspectId(id);
    setSelectedProspectActivityId(null);
    setSelectedCompanyId(null);
    setSelectedActivityId(null);
  };

  const handleProspectActivitySelect = (activity: ProspectActivity) => {
    setSelectedProspectActivityId(activity.id);
    setSelectedProspectId(activity.prospect_id || null);
    setSelectedCompanyId(null);
    setSelectedActivityId(null);
  };

  const goToView = (view: ViewMode) => {
    setViewMode(view);
    setSearch("");
    setSegmentFilter("todos");
    setStatusFilter("todos");
    if (view === "prospecting") {
      setSelectedCompanyId(null);
      setSelectedActivityId(null);
    } else {
      setSelectedProspectId(null);
      setSelectedProspectActivityId(null);
    }
  };

  const goToCompanyStatus = (status: CompanyStatus) => {
    setViewMode("companies");
    setStatusFilter(status);
    setSegmentFilter("todos");
    setSearch("");
  };

  const handlePreparedAction = (label: string) => {
    setMessage(`${label}: acción preparada para conectar con backend.`);
  };

  const handleCreateActivityForCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedActivityId(null);
    setActivityPanelOpen(true);
  };

  const handleCreateActivityForProspect = (prospectId: string) => {
    setSelectedProspectId(prospectId);
    setSelectedProspectActivityId(null);
    setProspectActivityPanelOpen(true);
  };

  if (!sessionReady) {
    return <CenteredMessage title="Cargando CRM" description="Validando sesion..." />;
  }

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">QE</span>
            <div>
              <p className="eyebrow">Quindío Exquisito</p>
              <h1>CRM comercial B2B</h1>
            </div>
          </div>
          <p className="login-copy">
            Ingresa para gestionar clientes actuales, contactos comerciales y seguimiento de la base comercial existente.
          </p>

          <form className="form-stack" onSubmit={handleSignIn}>
            <label className="field-label">
              Email
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field-label">
              Password
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {authError ? <p className="alert alert-danger">{authError}</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={authLoading}>
              <ShieldCheck size={18} />
              {authLoading ? "Entrando..." : "Entrar"}
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
          <NavButton icon={Home} label="Inicio" active={viewMode === "home"} onClick={() => goToView("home")} />
          <NavButton icon={Target} label="Prospección" active={false} onClick={() => router.push("/prospectos")} />
          <NavButton icon={Building2} label="Clientes" active={viewMode === "companies"} onClick={() => goToView("companies")} />
          <NavButton icon={UsersRound} label="Contactos" active={viewMode === "contacts"} onClick={() => goToView("contacts")} />
          <NavButton icon={ActivityIcon} label="Actividades" active={viewMode === "activities"} onClick={() => goToView("activities")} />
          <NavButton icon={ClipboardCheck} label="Actualización de datos" active={viewMode === "data"} onClick={() => goToView("data")} />
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost full-width" type="button" onClick={() => void handleSignOut()}>
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quindío Exquisito CRM</p>
            <h1>{getPageTitle(viewMode)}</h1>
          </div>
          <div className="topbar-actions">
            {viewMode === "data" ? (
              <button className="btn btn-secondary" type="button" onClick={() => handlePreparedAction("Enviar formulario de actualización")}>
                <Mail size={17} />
                Enviar formulario de actualización
              </button>
            ) : null}
            {viewMode === "prospecting" && selectedProspect ? (
              <button className="btn btn-primary" type="button" onClick={() => setProspectActivityPanelOpen(true)}>
                <Plus size={17} />
                Nueva actividad
              </button>
            ) : null}
            {viewMode !== "prospecting" && selectedCompany ? (
              <button className="btn btn-primary" type="button" onClick={() => setActivityPanelOpen(true)}>
                <Plus size={17} />
                Nueva actividad
              </button>
            ) : null}
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
            <Link className="btn btn-primary global-topbar-add-action" href="/agregar" aria-label="Agregar cliente o contacto">
              <Plus size={17} />
              Agregar
            </Link>
          </div>
        </header>

        {viewMode === "home" ? (
          <section className="metrics-grid" aria-label="Indicadores principales">
            <MetricCard icon={Target} label="Prospectos activos" value={activeProspectsCount} helper="oportunidades antes de convertirse" />
            <MetricCard icon={Building2} label="Clientes en base" value={data.companies.length} helper="clientes actuales cargados" />
            <MetricCard icon={UsersRound} label="Contactos comerciales" value={data.contacts.length} helper="personas asociadas a clientes" />
            <MetricCard icon={Mail} label="Contactos sin email" value={contactsWithoutEmail} helper="faltan correos de seguimiento" />
            <MetricCard icon={UserRound} label="Roles pendientes" value={rolesPending} helper="compras, chef/cocina o pagos por identificar" />
            <MetricCard icon={FileQuestion} label="Datos por validar" value={dataToValidateCount} helper="clientes o contactos con campos incompletos" />
            <MetricCard icon={CalendarClock} label="Seguimientos vencidos" value={overdueActivities + overdueProspectActivities} helper="actividades abiertas con fecha vencida" />
          </section>
        ) : null}

        {message ? <section className="alert alert-info">{message}</section> : null}

        {viewMode === "home" ? (
          <HomePanel
            companies={data.companies.length}
            prospects={activeProspectsCount}
            inFollowUp={inFollowUpCount}
            contacts={data.contacts.length}
            contactsWithoutEmail={contactsWithoutEmail}
            rolesPending={rolesPending}
            overdueActivities={overdueActivities}
            dataToValidate={dataToValidateCount}
            onOpenProspecting={() => router.push("/prospectos")}
            onOpenCompanies={() => goToView("companies")}
            onOpenFollowUp={() => goToView("companies")}
            onOpenContacts={() => goToView("contacts")}
            onOpenActivities={() => goToView("activities")}
            onOpenData={() => goToView("data")}
          />
        ) : (
          <section className={`crm-grid ${hasDetailPanel ? "" : "crm-grid-wide"}`}>
            <section className="list-panel">
              <div className="panel-toolbar">
                <div>
                  <p className="panel-kicker">{getViewTitle(viewMode)}</p>
                  <h2>{getViewHeading(viewMode)}</h2>
                </div>
                <span className="result-count">
                  {getResultCount(
                    viewMode,
                    filteredCompanies,
                    filteredContacts,
                    filteredActivities,
                    filteredDataIssues,
                    filteredCustomerResponses,
                    dataTab,
                    filteredProspects
                  )}
                </span>
              </div>

              {viewMode === "data" ? (
                <div className="subtabs" role="tablist" aria-label="Actualización de datos">
                  <button
                    className={`subtab ${dataTab === "pending" ? "active" : ""}`}
                    type="button"
                    onClick={() => setDataTab("pending")}
                  >
                    Datos pendientes
                  </button>
                  <button
                    className={`subtab ${dataTab === "responses" ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      setDataTab("responses");
                      void loadCustomerResponses();
                    }}
                  >
                    Respuestas de clientes
                    <span>{customerResponses.length}</span>
                  </button>
                </div>
              ) : null}

              <div className={`filters-row ${viewMode === "companies" || viewMode === "prospecting" ? "" : "filters-row-simple"}`}>
                <label className="search-box">
                  <Search size={17} />
                  <input
                    placeholder={getSearchPlaceholder(viewMode)}
                    aria-label={getSearchPlaceholder(viewMode)}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                {viewMode === "companies" || viewMode === "prospecting" ? (
                  <>
                    <label className="select-shell">
                      <Filter size={16} />
                      <select
                        aria-label={viewMode === "prospecting" ? "Filtrar prospectos por segmento" : "Filtrar clientes por segmento"}
                        value={segmentFilter}
                        onChange={(event) => setSegmentFilter(event.target.value)}
                      >
                        <option value="todos">Segmentos</option>
                        {(viewMode === "prospecting" ? prospectSegments : segments).map((segment) => (
                          <option key={segment} value={segment}>
                            {segment}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="select-shell">
                      <Filter size={16} />
                      <select
                        aria-label={viewMode === "prospecting" ? "Filtrar prospectos por estado" : "Filtrar clientes por estado"}
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        <option value="todos">Estados</option>
                        {viewMode === "prospecting"
                          ? PROSPECT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {prospectStatusLabels[status]}
                              </option>
                            ))
                          : COMPANY_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              {viewMode === "prospecting" ? (
                <ProspectsTable
                  prospects={filteredProspects}
                  selectedProspectId={selectedProspect?.id || null}
                  activitiesByProspectId={prospectActivitiesByProspectId}
                  convertingProspectId={convertingProspectId}
                  onSelect={handleProspectSelect}
                  onCreateActivity={handleCreateActivityForProspect}
                  onConvert={(prospect) => void convertProspectToCustomer(prospect)}
                />
              ) : null}
              {viewMode === "companies" ? (
                <CompanyTable
                  companies={filteredCompanies}
                  selectedCompanyId={selectedCompany?.id || null}
                  activitiesByCompanyId={activitiesByCompanyId}
                  onSelect={handleCompanySelect}
                  onCreateActivity={handleCreateActivityForCompany}
                  onChangeStatus={(companyId) => {
                    handleCompanySelect(companyId);
                    handlePreparedAction("Cambiar estado");
                  }}
                />
              ) : null}
              {viewMode === "contacts" ? (
                <ContactsTable
                  contacts={filteredContacts}
                  onSelectCompany={handleCompanySelect}
                  onCompleteData={(companyId) => {
                    if (companyId) handleCompanySelect(companyId);
                    handlePreparedAction("Completar datos de contacto");
                  }}
                />
              ) : null}
              {viewMode === "activities" ? (
                <ActivitiesTable
                  activities={filteredActivities}
                  companyById={companyById}
                  selectedActivityId={selectedActivityId}
                  onSelect={handleActivitySelect}
                />
              ) : null}
              {viewMode === "data" && dataTab === "pending" ? <DataIssuesTable issues={filteredDataIssues} onSelectCompany={handleCompanySelect} /> : null}
              {viewMode === "data" && dataTab === "responses" ? (
                <CustomerResponsesTable
                  responses={filteredCustomerResponses}
                  loading={customerResponsesLoading}
                  error={customerResponsesError}
                  processingResponseId={processingResponseId}
                  onApprove={(response) => void reviewCustomerResponse(response, "approve")}
                  onReject={(response) => void reviewCustomerResponse(response, "reject")}
                  onRetry={() => void loadCustomerResponses()}
                />
              ) : null}
            </section>

            {viewMode === "prospecting" && selectedProspect ? (
              <ProspectDetailPanel
                prospect={selectedProspect}
                activities={selectedProspectActivities}
                selectedActivity={selectedProspectActivity}
                nextActivity={nextProspectActivity}
                converting={convertingProspectId === selectedProspect.id}
                onToggleActivity={toggleProspectActivityCompleted}
                onNewActivity={() => setProspectActivityPanelOpen(true)}
                onConvert={() => void convertProspectToCustomer(selectedProspect)}
              />
            ) : null}
            {viewMode !== "prospecting" && selectedCompany ? (
              <CompanyDetailPanel
                company={selectedCompany}
                contacts={selectedContacts}
                activities={selectedActivities}
                selectedActivity={selectedActivity}
                nextActivity={nextActivity}
                onStatusChange={updateCompanyStatus}
                onToggleActivity={toggleActivityCompleted}
                onNewActivity={() => setActivityPanelOpen(true)}
                onPreparedAction={handlePreparedAction}
              />
            ) : null}
          </section>
        )}
      </section>

      {activityPanelOpen && selectedCompany ? (
        <ActivityPanel
          company={selectedCompany}
          activityType={newActivityType}
          dueDate={newActivityDueDate}
          notes={newActivityNotes}
          onTypeChange={setNewActivityType}
          onDueDateChange={setNewActivityDueDate}
          onNotesChange={setNewActivityNotes}
          onClose={() => setActivityPanelOpen(false)}
          onSubmit={addActivity}
        />
      ) : null}
      {prospectActivityPanelOpen && selectedProspect ? (
        <ProspectActivityPanel
          prospect={selectedProspect}
          activityType={newProspectActivityType}
          dueDate={newProspectActivityDueDate}
          notes={newProspectActivityNotes}
          onTypeChange={setNewProspectActivityType}
          onDueDateChange={setNewProspectActivityDueDate}
          onNotesChange={setNewProspectActivityNotes}
          onClose={() => setProspectActivityPanelOpen(false)}
          onSubmit={addProspectActivity}
        />
      ) : null}
    </main>
  );
}
function CompanyDetailPanel({
  company,
  contacts,
  activities,
  selectedActivity,
  nextActivity,
  onStatusChange,
  onToggleActivity,
  onNewActivity,
  onPreparedAction,
}: {
  company: Company | null;
  contacts: Contact[];
  activities: Activity[];
  selectedActivity: Activity | null;
  nextActivity: Activity | null;
  onStatusChange: (company: Company, status: CompanyStatus) => void;
  onToggleActivity: (activity: Activity) => void;
  onNewActivity: () => void;
  onPreparedAction: (label: string) => void;
}) {
  if (!company) {
    return <aside className="detail-panel"><CenteredMessage title="Sin selección" description="Selecciona un cliente o actividad para ver el detalle." /></aside>;
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="tag-row">
            <span className="badge tone-emerald">Cliente actual</span>
            <StatusBadge status={company.status} />
            {company.segment ? <span className="badge">{company.segment}</span> : <span className="badge tone-amber">Segmento pendiente</span>}
          </div>
          <h2>{company.name}</h2>
          <p>{company.legal_name || "Razón social pendiente"}</p>
          <Link
            id="qe-add-contact-detail-link"
            className="btn btn-primary"
            href={`/contactos/nuevo?companyId=${encodeURIComponent(company.id)}`}
            aria-label="Agregar contacto a esta empresa"
            style={{ marginTop: 10 }}
          >
            + Agregar contacto
          </Link>
        </div>
        <label className="status-select">
          Estado comercial
          <select value={normalizeStatus(company.status)} onChange={(event) => onStatusChange(company, event.target.value as CompanyStatus)}>
            {COMPANY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="detail-grid">
        <DetailItem icon={Tag} label="Segmento" value={company.segment || "Pendiente"} />
        <DetailItem icon={Building2} label="NIT" value={company.nit} />
        <DetailItem icon={LayoutDashboard} label="Ciudad" value={company.city} />
        <DetailItem icon={Phone} label="Teléfono" value={company.phone} type="phone" />
      </section>

      <DetailBlock title="Dirección de entrega" value={company.address || "No registrada"} />
      {company.website ? <DetailItem className="detail-item-wide" icon={ExternalLink} label="Website" value={company.website} type="link" /> : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Estado de datos</h3>
          <CompanyDataBadge company={company} contacts={contacts} />
        </div>
      </section>

      {selectedActivity ? (
        <section className="detail-section selected-activity">
          <div className="section-title-row">
            <h3>Actividad seleccionada</h3>
            <span>{selectedActivity.due_date || "Sin fecha"}</span>
          </div>
          <ActivityCard activity={selectedActivity} onToggle={onToggleActivity} />
        </section>
      ) : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Contactos</h3>
          <span>{contacts.length}</span>
        </div>
        <div className="stack">
          {contacts.length ? (
            contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)
          ) : (
            <EmptyState title="Sin contactos" description="Agrega contacto de compras, cocina/chef o pagos." />
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Próxima actividad</h3>
          <button className="btn btn-secondary compact" type="button" onClick={onNewActivity}>
            <Plus size={15} />
            Nueva
          </button>
        </div>
        {nextActivity ? (
          <ActivityCard activity={nextActivity} onToggle={onToggleActivity} />
        ) : (
          <EmptyState title="Sin seguimiento programado" description="Crea una actividad para mantener viva esta cuenta." />
        )}
      </section>

      {company.notes ? <DetailBlock title="Notas comerciales" value={company.notes} /> : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Acciones</h3>
        </div>
        <div className="row-actions">
          <button className="btn btn-secondary compact" type="button" onClick={() => onPreparedAction("Completar datos")}>
            Completar datos
          </button>
          <button className="btn btn-secondary compact" type="button" onClick={() => onPreparedAction("Enviar formulario de actualización")}>
            Enviar formulario de actualización
          </button>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Historial de seguimiento</h3>
          <span>{activities.length}</span>
        </div>
        <div className="stack">
          {activities.length ? (
            activities.map((activity) => <ActivityCard key={activity.id} activity={activity} onToggle={onToggleActivity} />)
          ) : (
            <EmptyState title="Sin historial" description="Las llamadas, emails y tareas apareceran aqui." />
          )}
        </div>
      </section>
    </aside>
  );
}

function ProspectDetailPanel({
  prospect,
  activities,
  selectedActivity,
  nextActivity,
  converting,
  onToggleActivity,
  onNewActivity,
  onConvert,
}: {
  prospect: Prospect | null;
  activities: ProspectActivity[];
  selectedActivity: ProspectActivity | null;
  nextActivity: ProspectActivity | null;
  converting: boolean;
  onToggleActivity: (activity: ProspectActivity) => void;
  onNewActivity: () => void;
  onConvert: () => void;
}) {
  if (!prospect) {
    return <aside className="detail-panel"><CenteredMessage title="Sin selección" description="Selecciona un prospecto para ver el detalle." /></aside>;
  }

  const status = normalizeProspectStatus(prospect.status);
  const converted = status === "convertido_cliente";

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="tag-row">
            <span className="badge tone-blue">Prospecto</span>
            <ProspectStatusBadge status={prospect.status} />
            {prospect.segment ? <span className="badge">{prospect.segment}</span> : <span className="badge tone-amber">Segmento pendiente</span>}
          </div>
          <h2>{getProspectDisplayName(prospect)}</h2>
          <p>{prospect.legal_name || prospect.source || "Oportunidad comercial"}</p>
        </div>
        <button className="btn btn-primary" type="button" disabled={converted || converting} onClick={onConvert}>
          <Building2 size={17} />
          {converting ? "Convirtiendo" : converted ? "Convertido" : "Convertir a cliente"}
        </button>
      </div>

      <section className="detail-grid">
        <DetailItem icon={Tag} label="Segmento" value={prospect.segment || "Pendiente"} />
        <DetailItem icon={LayoutDashboard} label="Ciudad" value={prospect.city} />
        <DetailItem icon={Phone} label="Teléfono" value={prospect.phone} type="phone" />
        <DetailItem icon={FileQuestion} label="Origen" value={prospect.source} />
      </section>

      <DetailBlock title="Dirección" value={prospect.address || "No registrada"} />
      {prospect.website ? <DetailItem className="detail-item-wide" icon={ExternalLink} label="Website" value={prospect.website} type="link" /> : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Contacto de prospección</h3>
        </div>
        <article className="contact-card">
          <div className="avatar">
            <UserRound size={17} />
          </div>
          <div>
            <h4>{prospect.contact_name || "Contacto pendiente"}</h4>
            <p>{prospect.contact_role || "Rol pendiente"}</p>
            <div className="contact-links">
              {prospect.contact_email ? (
                <a href={`mailto:${prospect.contact_email}`}>
                  <Mail size={14} />
                  {prospect.contact_email}
                </a>
              ) : (
                <span>Sin email</span>
              )}
              {prospect.contact_phone ? (
                <a href={`tel:${prospect.contact_phone}`}>
                  <Phone size={14} />
                  {prospect.contact_phone}
                </a>
              ) : (
                <span>Teléfono pendiente</span>
              )}
            </div>
          </div>
        </article>
      </section>

      {selectedActivity ? (
        <section className="detail-section selected-activity">
          <div className="section-title-row">
            <h3>Actividad seleccionada</h3>
            <span>{selectedActivity.due_date || "Sin fecha"}</span>
          </div>
          <ProspectActivityCard activity={selectedActivity} onToggle={onToggleActivity} />
        </section>
      ) : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Próxima actividad</h3>
          <button className="btn btn-secondary compact" type="button" onClick={onNewActivity}>
            <Plus size={15} />
            Nueva
          </button>
        </div>
        {nextActivity ? (
          <ProspectActivityCard activity={nextActivity} onToggle={onToggleActivity} />
        ) : (
          <EmptyState title="Sin seguimiento programado" description="Crea una actividad para avanzar esta oportunidad." />
        )}
      </section>

      {prospect.notes ? <DetailBlock title="Notas de prospección" value={prospect.notes} /> : null}

      <section className="detail-section">
        <div className="section-title-row">
          <h3>Actividades de prospección</h3>
          <span>{activities.length}</span>
        </div>
        <div className="stack">
          {activities.length ? (
            activities.map((activity) => <ProspectActivityCard key={activity.id} activity={activity} onToggle={onToggleActivity} />)
          ) : (
            <EmptyState title="Sin historial" description="Las llamadas, emails y tareas del prospecto aparecerán aquí." />
          )}
        </div>
      </section>
    </aside>
  );
}

function ActivityPanel({
  company,
  activityType,
  dueDate,
  notes,
  onTypeChange,
  onDueDateChange,
  onNotesChange,
  onClose,
  onSubmit,
}: {
  company: Company;
  activityType: ActivityType;
  dueDate: string;
  notes: string;
  onTypeChange: (type: ActivityType) => void;
  onDueDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="activity-panel-backdrop" role="dialog" aria-modal="true" aria-label="Nueva actividad">
      <section className="activity-panel">
        <div className="activity-panel-header">
          <div>
            <p className="panel-kicker">Seguimiento</p>
            <h2>Nueva actividad</h2>
            <span>{company.name}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form className="activity-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field-label">
              Tipo
              <select className="select" value={activityType} onChange={(event) => onTypeChange(event.target.value as ActivityType)}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {activityTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Fecha objetivo
              <input className="input" type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
            </label>
          </div>
          <label className="field-label">
            Nota
            <textarea
              className="textarea"
              placeholder="Ej. Llamar al contacto de compras para validar consumo mensual."
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </label>
          <div className="panel-actions">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit">
              <MessageSquarePlus size={17} />
              Guardar actividad
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProspectActivityPanel({
  prospect,
  activityType,
  dueDate,
  notes,
  onTypeChange,
  onDueDateChange,
  onNotesChange,
  onClose,
  onSubmit,
}: {
  prospect: Prospect;
  activityType: ActivityType;
  dueDate: string;
  notes: string;
  onTypeChange: (type: ActivityType) => void;
  onDueDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="activity-panel-backdrop" role="dialog" aria-modal="true" aria-label="Nueva actividad de prospección">
      <section className="activity-panel">
        <div className="activity-panel-header">
          <div>
            <p className="panel-kicker">Prospección</p>
            <h2>Nueva actividad</h2>
            <span>{getProspectDisplayName(prospect)}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form className="activity-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field-label">
              Tipo
              <select className="select" value={activityType} onChange={(event) => onTypeChange(event.target.value as ActivityType)}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {activityTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Fecha objetivo
              <input className="input" type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
            </label>
          </div>
          <label className="field-label">
            Nota
            <textarea
              className="textarea"
              placeholder="Ej. Validar volumen potencial y contacto de compras."
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </label>
          <div className="panel-actions">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit">
              <MessageSquarePlus size={17} />
              Guardar actividad
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  type = "text",
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  type?: "text" | "link" | "phone";
  className?: string;
}) {
  const href = type === "link" && value ? normalizeUrl(value) : type === "phone" && value ? `tel:${value}` : "";

  return (
    <div className={`detail-item ${className}`}>
      <Icon size={16} />
      <div>
        <dt>{label}</dt>
        <dd>
          {value ? (
            type === "text" ? (
              value
            ) : (
              <a href={href} target={type === "link" ? "_blank" : undefined} rel={type === "link" ? "noreferrer" : undefined}>
                {value}
              </a>
            )
          ) : (
            "Pendiente"
          )}
        </dd>
      </div>
    </div>
  );
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="detail-block">
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const issues = getContactIssues(contact);

  return (
    <article className={`contact-card ${issues.length ? "needs-data" : ""}`}>
      <div className="avatar">
        <UserRound size={17} />
      </div>
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
            <span>Sin email</span>
          )}
          {contact.phone ? (
            <a href={`tel:${contact.phone}`}>
              <Phone size={14} />
              {contact.phone}
            </a>
          ) : (
            <span>Teléfono pendiente</span>
          )}
        </div>
        {issues.length ? (
          <div className="issue-row">
            {issues.map((issue) => <span className="issue-badge" key={issue}>{issue}</span>)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ActivityCard({ activity, onToggle }: { activity: Activity; onToggle?: (activity: Activity) => void }) {
  return (
    <article className={`activity-card ${isOverdue(activity) ? "overdue" : ""}`}>
      <div className="activity-meta">
        <span className="badge">{formatActivityType(activity.activity_type)}</span>
        <span className="badge">{activity.completed ? "Completada" : isOverdue(activity) ? "Vencida" : "Pendiente"}</span>
      </div>
      <p>{activity.notes || "Sin notas"}</p>
      <div className="activity-footer">
        <span>{activity.due_date ? `Vence: ${activity.due_date}` : "Sin fecha objetivo"}</span>
        {onToggle ? (
          <button className="btn btn-secondary compact" type="button" onClick={() => onToggle(activity)}>
            <CheckCircle2 size={15} />
            {activity.completed ? "Reabrir" : "Completar"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ProspectActivityCard({ activity, onToggle }: { activity: ProspectActivity; onToggle?: (activity: ProspectActivity) => void }) {
  return (
    <article className={`activity-card ${isOverdue(activity) ? "overdue" : ""}`}>
      <div className="activity-meta">
        <span className="badge">{formatActivityType(activity.activity_type)}</span>
        <span className="badge">{activity.completed ? "Completada" : isOverdue(activity) ? "Vencida" : "Pendiente"}</span>
      </div>
      <p>{activity.notes || "Sin notas"}</p>
      <div className="activity-footer">
        <span>{activity.due_date ? `Vence: ${activity.due_date}` : "Sin fecha objetivo"}</span>
        {onToggle ? (
          <button className="btn btn-secondary compact" type="button" onClick={() => onToggle(activity)}>
            <CheckCircle2 size={15} />
            {activity.completed ? "Reabrir" : "Completar"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);
  return <span className={`badge ${statusTone[normalized]}`}>{statusLabels[normalized]}</span>;
}

function ProspectStatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeProspectStatus(status);
  return <span className={`badge ${prospectStatusTone[normalized]}`}>{prospectStatusLabels[normalized]}</span>;
}

function CompanyDataBadge({ company, contacts }: { company: Company; contacts: Contact[] }) {
  const issueCount = getCompanyIssues(company).length + contacts.reduce((count, contact) => count + getContactIssues(contact).length, 0);
  return issueCount ? <span className="issue-badge">{issueCount} campos pendientes</span> : <span className="ok-badge">Datos suficientes</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <CircleAlert size={18} />
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
