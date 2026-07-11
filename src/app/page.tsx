"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { getSupabaseClient } from "@/lib/supabase";
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
  type ProspectStatus,
} from "@/lib/types";

type ViewMode = "home" | "prospecting" | "companies" | "contacts" | "activities" | "data";

interface DashboardData {
  companies: Company[];
  contacts: Contact[];
  activities: Activity[];
  prospects: Prospect[];
  prospectActivities: ProspectActivity[];
}

interface DataIssueGroup {
  id: string;
  type: "company" | "contact";
  title: string;
  subtitle: string;
  issues: string[];
  companyId: string | null;
}

type DataTab = "pending" | "responses";

type CustomerUpdateResponse = Record<string, unknown> & {
  response_id?: string | number | null;
  id?: string | number | null;
  cliente_id?: string | null;
  company_id?: string | null;
  nombre_cliente?: string | null;
  company_name?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  payload?: Record<string, unknown> | null;
};

interface CustomerUpdateChange {
  label: string;
  currentValue: string;
  newValue: string;
}

const initialData: DashboardData = {
  companies: [],
  contacts: [],
  activities: [],
  prospects: [],
  prospectActivities: [],
};

const statusLabels: Record<CompanyStatus, string> = {
  nuevo: "Estado por validar",
  "por validar": "Por validar",
  contactado: "Contactado",
  interesado: "Interesado",
  cotizado: "Cotizado",
  cliente: "Cliente activo",
  descartado: "Descartado",
};

const activityTypeLabels: Record<ActivityType, string> = {
  note: "Nota",
  call: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  follow_up: "Seguimiento",
  meeting: "Reunion",
};

const prospectStatusLabels: Record<ProspectStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  cotizado: "Cotizado",
  convertido: "Convertido a cliente",
  descartado: "Descartado",
};

const statusTone: Record<CompanyStatus, string> = {
  nuevo: "tone-slate",
  "por validar": "tone-amber",
  contactado: "tone-blue",
  interesado: "tone-green",
  cotizado: "tone-violet",
  cliente: "tone-emerald",
  descartado: "tone-muted",
};

const prospectStatusTone: Record<ProspectStatus, string> = {
  nuevo: "tone-slate",
  contactado: "tone-blue",
  calificado: "tone-green",
  cotizado: "tone-violet",
  convertido: "tone-emerald",
  descartado: "tone-muted",
};

export default function HomePage() {
  const supabase = getSupabaseClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProspectActivityId, setSelectedProspectActivityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dataTab, setDataTab] = useState<DataTab>("pending");
  const [customerResponses, setCustomerResponses] = useState<CustomerUpdateResponse[]>([]);
  const [customerResponsesLoading, setCustomerResponsesLoading] = useState(false);
  const [customerResponsesError, setCustomerResponsesError] = useState<string | null>(null);
  const [processingResponseId, setProcessingResponseId] = useState<string | null>(null);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityType, setNewActivityType] = useState<ActivityType>("follow_up");
  const [newActivityDueDate, setNewActivityDueDate] = useState("");
  const [prospectActivityPanelOpen, setProspectActivityPanelOpen] = useState(false);
  const [newProspectActivityNotes, setNewProspectActivityNotes] = useState("");
  const [newProspectActivityType, setNewProspectActivityType] = useState<ActivityType>("follow_up");
  const [newProspectActivityDueDate, setNewProspectActivityDueDate] = useState("");
  const [convertingProspectId, setConvertingProspectId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: authData }) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(authData.session));
      setSessionReady(true);
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

  useEffect(() => {
    if (isAuthenticated) void loadData();
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [companiesResult, contactsResult, activitiesResult, prospectsResult, prospectActivitiesResult] = await Promise.all([
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("contacts").select("*").order("company_name", { ascending: true }),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
      supabase.from("prospects").select("*").order("name", { ascending: true }),
      supabase.from("prospect_activities").select("*").order("created_at", { ascending: false }),
    ]);

    if (companiesResult.error || contactsResult.error || activitiesResult.error) {
      setMessage(
        companiesResult.error?.message ||
          contactsResult.error?.message ||
          activitiesResult.error?.message ||
          "No pudimos cargar los datos."
      );
      setLoading(false);
      return;
    }

    const companies = (companiesResult.data || []) as Company[];
    const contacts = (contactsResult.data || []) as Contact[];
    const activities = (activitiesResult.data || []) as Activity[];
    const prospects = prospectsResult.error ? [] : ((prospectsResult.data || []) as Prospect[]);
    const prospectActivities = prospectActivitiesResult.error ? [] : ((prospectActivitiesResult.data || []) as ProspectActivity[]);

    setData({ companies, contacts, activities, prospects, prospectActivities });
    setSelectedCompanyId((current) => (current && companies.some((company) => company.id === current) ? current : null));
    setSelectedActivityId((current) => (current && activities.some((activity) => activity.id === current) ? current : null));
    setSelectedProspectId((current) => (current && prospects.some((prospect) => prospect.id === current) ? current : null));
    setSelectedProspectActivityId((current) =>
      current && prospectActivities.some((activity) => activity.id === current) ? current : null
    );
    if (prospectsResult.error || prospectActivitiesResult.error) {
      setMessage(prospectsResult.error?.message || prospectActivitiesResult.error?.message || "No pudimos cargar prospeccion.");
    }
    setLoading(false);
    void loadCustomerResponses();
  }

  async function loadCustomerResponses() {
    setCustomerResponsesLoading(true);
    setCustomerResponsesError(null);

    const { data: responses, error } = await supabase.rpc("get_cu_pending_reviews");

    if (error) {
      setCustomerResponses([]);
      setCustomerResponsesError(error.message);
      setCustomerResponsesLoading(false);
      return;
    }

    setCustomerResponses(((responses || []) as CustomerUpdateResponse[]).filter((response) => Boolean(getResponseId(response))));
    setCustomerResponsesLoading(false);
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
    setData(initialData);
    setCustomerResponses([]);
    setSelectedCompanyId(null);
    setSelectedActivityId(null);
    setSelectedProspectId(null);
    setSelectedProspectActivityId(null);
    setIsAuthenticated(false);
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
      .select("*")
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
      .select("*")
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
    if (normalizeProspectStatus(prospect.status) === "convertido") return;

    setConvertingProspectId(prospect.id);
    setMessage(null);

    const { data: inserted, error: insertError } = await supabase
      .from("companies")
      .insert({
        name: prospect.name,
        legal_name: prospect.legal_name,
        nit: prospect.nit,
        segment: prospect.segment,
        city: prospect.city,
        website: prospect.website,
        phone: prospect.phone,
        address: prospect.address,
        status: "cliente",
        notes: buildConvertedProspectNotes(prospect),
      })
      .select("*")
      .single();

    if (insertError) {
      setMessage(insertError.message);
      setConvertingProspectId(null);
      return;
    }

    const company = inserted as Company;
    const { error: updateError } = await supabase
      .from("prospects")
      .update({
        status: "convertido",
        converted_company_id: company.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospect.id);

    if (updateError) {
      setMessage(updateError.message);
      setConvertingProspectId(null);
      return;
    }

    setData((current) => ({
      ...current,
      companies: [...current.companies, company].sort((a, b) => a.name.localeCompare(b.name)),
      prospects: current.prospects.map((item) =>
        item.id === prospect.id ? { ...item, status: "convertido", converted_company_id: company.id } : item
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

  async function reviewCustomerResponse(response: CustomerUpdateResponse, action: "approve" | "reject") {
    const responseId = getResponseId(response);
    if (!responseId) return;

    setProcessingResponseId(responseId);
    const rpcName = action === "approve" ? "approve_cu_response" : "reject_cu_response";
    const { error } = await supabase.rpc(rpcName, { response_id: responseId });

    if (error) {
      setMessage(error.message);
      setProcessingResponseId(null);
      return;
    }

    setCustomerResponses((current) => current.filter((item) => getResponseId(item) !== responseId));
    setMessage(action === "approve" ? "Respuesta aprobada." : "Respuesta rechazada.");
    setProcessingResponseId(null);
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
          prospect.name,
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
  const nextProspectActivity = getNextProspectActivity(selectedProspectActivities);

  const inFollowUpCount = data.companies.filter(isInFollowUp).length;
  const activeProspectsCount = data.prospects.filter((prospect) => !["convertido", "descartado"].includes(normalizeProspectStatus(prospect.status))).length;
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
          <NavButton icon={Home} label="Inicio" active={viewMode === "home"} onClick={() => goToView("home")} />
          <NavButton icon={Target} label="Prospección" active={viewMode === "prospecting"} onClick={() => goToView("prospecting")} />
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
            onOpenProspecting={() => goToView("prospecting")}
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
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                {viewMode === "companies" || viewMode === "prospecting" ? (
                  <>
                    <label className="select-shell">
                      <Filter size={16} />
                      <select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
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
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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

function HomePanel({
  companies,
  prospects,
  inFollowUp,
  contacts,
  contactsWithoutEmail,
  rolesPending,
  overdueActivities,
  dataToValidate,
  onOpenProspecting,
  onOpenCompanies,
  onOpenFollowUp,
  onOpenContacts,
  onOpenActivities,
  onOpenData,
}: {
  companies: number;
  prospects: number;
  inFollowUp: number;
  contacts: number;
  contactsWithoutEmail: number;
  rolesPending: number;
  overdueActivities: number;
  dataToValidate: number;
  onOpenProspecting: () => void;
  onOpenCompanies: () => void;
  onOpenFollowUp: () => void;
  onOpenContacts: () => void;
  onOpenActivities: () => void;
  onOpenData: () => void;
}) {
  return (
    <section className="home-panel">
      <div className="home-copy">
        <p className="panel-kicker">Operación comercial</p>
        <h2>Prioriza clientes y contactos antes de vender más.</h2>
        <p>
          Esta vista separa prospectos de clientes actuales para cuidar el embudo comercial sin mezclar oportunidades con cuentas
          convertidas.
        </p>
      </div>

      <div className="action-grid">
        <ActionCard icon={Target} label="Prospección" value={prospects} helper="Oportunidades fuera de la base de clientes" onClick={onOpenProspecting} />
        <ActionCard icon={Building2} label="Clientes en base" value={companies} helper="Clientes actuales cargados" onClick={onOpenCompanies} />
        <ActionCard icon={UsersRound} label="Contactos comerciales" value={contacts} helper="Personas asociadas a clientes" onClick={onOpenContacts} />
        <ActionCard icon={Tag} label="En seguimiento" value={inFollowUp} helper="Clientes con gestión comercial abierta" onClick={onOpenFollowUp} />
        <ActionCard icon={Mail} label="Contactos sin email" value={contactsWithoutEmail} helper="Falta canal para cotizaciones o seguimiento" onClick={onOpenContacts} />
        <ActionCard icon={UserRound} label="Roles pendientes" value={rolesPending} helper="Identificar compras, cocina/chef o pagos" onClick={onOpenContacts} />
        <ActionCard icon={CalendarClock} label="Actividades vencidas" value={overdueActivities} helper="Seguimientos que necesitan acción" onClick={onOpenActivities} />
        <ActionCard icon={ClipboardCheck} label="Datos por validar" value={dataToValidate} helper="Clientes o contactos con campos incompletos" onClick={onOpenData} />
      </div>
    </section>
  );
}

function ActionCard({
  icon: Icon,
  label,
  value,
  helper,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button className="action-card" type="button" onClick={onClick}>
      <span className="metric-icon">
        <Icon size={18} />
      </span>
      <span>
        <strong>{value}</strong>
        <span className="action-label">{label}</span>
        <span className="action-helper">{helper}</span>
      </span>
    </button>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: number; helper: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
    </article>
  );
}

function ProspectsTable({
  prospects,
  selectedProspectId,
  activitiesByProspectId,
  convertingProspectId,
  onSelect,
  onCreateActivity,
  onConvert,
}: {
  prospects: Prospect[];
  selectedProspectId: string | null;
  activitiesByProspectId: Map<string, ProspectActivity[]>;
  convertingProspectId: string | null;
  onSelect: (id: string) => void;
  onCreateActivity: (id: string) => void;
  onConvert: (prospect: Prospect) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Prospecto</th>
            <th>Segmento</th>
            <th>Estado</th>
            <th>Contacto</th>
            <th>Próxima acción</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect) => {
            const nextActivity = getNextProspectActivity(activitiesByProspectId.get(prospect.id) || []);
            const status = normalizeProspectStatus(prospect.status);
            const isConverted = status === "convertido";
            const isConverting = convertingProspectId === prospect.id;

            return (
              <tr key={prospect.id} className={selectedProspectId === prospect.id ? "selected" : ""} onClick={() => onSelect(prospect.id)}>
                <td>
                  <strong>{prospect.name}</strong>
                  <span>{prospect.source || prospect.city || "Origen pendiente"}</span>
                </td>
                <td>{prospect.segment || "Sin segmento"}</td>
                <td>
                  <ProspectStatusBadge status={prospect.status} />
                </td>
                <td>
                  <strong>{prospect.contact_name || "Contacto pendiente"}</strong>
                  <span>{prospect.contact_email || prospect.contact_phone || "-"}</span>
                </td>
                <td>
                  {nextActivity?.due_date ? `${formatActivityType(nextActivity.activity_type)} · ${nextActivity.due_date}` : "Sin seguimiento"}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn btn-secondary compact"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateActivity(prospect.id);
                      }}
                    >
                      <Plus size={14} />
                      Crear actividad
                    </button>
                    <button
                      className="btn btn-primary compact"
                      type="button"
                      disabled={isConverted || isConverting}
                      onClick={(event) => {
                        event.stopPropagation();
                        onConvert(prospect);
                      }}
                    >
                      {isConverting ? "Convirtiendo" : isConverted ? "Convertido" : "Convertir a cliente"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!prospects.length ? <EmptyState title="Sin prospectos" description="No hay prospectos con esos filtros." /> : null}
    </div>
  );
}

function CompanyTable({
  companies,
  selectedCompanyId,
  activitiesByCompanyId,
  onSelect,
  onCreateActivity,
  onChangeStatus,
}: {
  companies: Company[];
  selectedCompanyId: string | null;
  activitiesByCompanyId: Map<string, Activity[]>;
  onSelect: (id: string) => void;
  onCreateActivity: (id: string) => void;
  onChangeStatus: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Segmento</th>
            <th>Ciudad</th>
            <th>Teléfono</th>
            <th>Estado de datos</th>
            <th>Próxima acción</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const nextActivity = getNextActivity(activitiesByCompanyId.get(company.id) || []);
            const companyIssues = getCompanyIssues(company);

            return (
              <tr key={company.id} className={selectedCompanyId === company.id ? "selected" : ""} onClick={() => onSelect(company.id)}>
                <td>
                  <strong>{company.name}</strong>
                  <span>{company.legal_name || company.nit || "Datos legales pendientes"}</span>
                </td>
                <td>{company.segment || "Sin segmento"}</td>
                <td>{company.city || "-"}</td>
                <td>{company.phone || "-"}</td>
                <td>
                  {companyIssues.length ? (
                    <span className="issue-badge">{companyIssues.length} dato(s)</span>
                  ) : (
                    <span className="ok-badge">Datos suficientes</span>
                  )}
                </td>
                <td>{nextActivity?.due_date ? `${formatActivityType(nextActivity.activity_type)} · ${nextActivity.due_date}` : "Sin seguimiento"}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn btn-secondary compact"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateActivity(company.id);
                      }}
                    >
                      <Plus size={14} />
                      Crear actividad
                    </button>
                    <button
                      className="btn btn-secondary compact"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(company.id);
                      }}
                    >
                      Cambiar estado
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!companies.length ? <EmptyState title="Sin clientes" description="No hay clientes con esos filtros." /> : null}
    </div>
  );
}

function ContactsTable({
  contacts,
  onSelectCompany,
  onCompleteData,
}: {
  contacts: Contact[];
  onSelectCompany: (id: string) => void;
  onCompleteData: (companyId: string | null) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contacto comercial</th>
            <th>Cliente</th>
            <th>Rol operativo</th>
            <th>Datos</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const issues = getContactIssues(contact);
            return (
              <tr key={contact.id}>
                <td>
                  <strong>{contact.full_name || "Sin nombre"}</strong>
                  <span>{contact.phone || "Teléfono pendiente"}</span>
                </td>
                <td>
                  <button className="table-link" onClick={() => contact.company_id && onSelectCompany(contact.company_id)} type="button">
                    {contact.company_name || "-"}
                  </button>
                </td>
                <td>{formatContactRole(contact.role)}</td>
                <td>
                  <div className="issue-row">
                    {issues.length ? issues.map((issue) => <span className="issue-badge" key={issue}>{issue}</span>) : <span className="ok-badge">Datos útiles</span>}
                  </div>
                </td>
                <td>
                  <button className="btn btn-secondary compact" type="button" onClick={() => onCompleteData(contact.company_id)}>
                    {issues.length ? "Completar datos" : "Editar contacto"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!contacts.length ? <EmptyState title="Sin contactos" description="No hay contactos comerciales con esa búsqueda." /> : null}
    </div>
  );
}

function ActivitiesTable({
  activities,
  companyById,
  selectedActivityId,
  onSelect,
}: {
  activities: Activity[];
  companyById: Map<string, Company>;
  selectedActivityId: string | null;
  onSelect: (activity: Activity) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Seguimiento</th>
            <th>Vence</th>
            <th>Estado</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              className={selectedActivityId === activity.id ? "selected" : ""}
              onClick={() => onSelect(activity)}
            >
              <td>
                <strong>{activity.company_id ? companyById.get(activity.company_id)?.name || "-" : "-"}</strong>
                <span>{activity.company_id ? companyById.get(activity.company_id)?.segment || "Sin segmento" : "Sin cliente"}</span>
              </td>
              <td>{formatActivityType(activity.activity_type)}</td>
              <td>{activity.due_date || "-"}</td>
              <td>{activity.completed ? "Completada" : isOverdue(activity) ? "Vencida" : "Pendiente"}</td>
              <td>{activity.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!activities.length ? <EmptyState title="Sin actividades" description="No hay seguimiento con esa búsqueda." /> : null}
    </div>
  );
}

function DataIssuesTable({ issues, onSelectCompany }: { issues: DataIssueGroup[]; onSelectCompany: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Registro</th>
            <th>Tipo</th>
            <th>Campos pendientes</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td>
                <strong>{issue.title}</strong>
                <span>{issue.subtitle}</span>
              </td>
              <td>{issue.type === "company" ? "Cliente" : "Contacto comercial"}</td>
              <td>
                <div className="issue-row">
                  {issue.issues.map((item) => <span className="issue-badge" key={item}>{item}</span>)}
                </div>
              </td>
              <td>
                {issue.companyId ? (
                  <button className="btn btn-secondary compact" type="button" onClick={() => onSelectCompany(issue.companyId!)}>
                    Ver ficha
                  </button>
                ) : (
                  "Relación pendiente"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!issues.length ? <EmptyState title="Datos al día" description="No hay pendientes visibles con esa búsqueda." /> : null}
    </div>
  );
}

function CustomerResponsesTable({
  responses,
  loading,
  error,
  processingResponseId,
  onApprove,
  onReject,
  onRetry,
}: {
  responses: CustomerUpdateResponse[];
  loading: boolean;
  error: string | null;
  processingResponseId: string | null;
  onApprove: (response: CustomerUpdateResponse) => void;
  onReject: (response: CustomerUpdateResponse) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return <EmptyState title="Cargando respuestas" description="Consultando formularios pendientes de revisión." />;
  }

  if (error) {
    return (
      <div className="review-error">
        <strong>No pudimos cargar las respuestas.</strong>
        <span>{error}</span>
        <button className="btn btn-secondary compact" type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Comparación</th>
            <th>Fecha</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => {
            const responseId = getResponseId(response);
            const changes = getResponseChanges(response);
            const isProcessing = responseId ? processingResponseId === responseId : false;

            return (
              <tr key={responseId || getResponseCustomerName(response)}>
                <td>
                  <strong>{getResponseCustomerName(response)}</strong>
                  <span>{getResponseSubtitle(response)}</span>
                </td>
                <td>
                  <div className="comparison-stack">
                    {changes.map((change) => (
                      <div className="comparison-row" key={`${responseId}-${change.label}`}>
                        <strong>{change.label}</strong>
                        <span>
                          <em>Actual:</em> {change.currentValue || "-"}
                        </span>
                        <span>
                          <em>Nuevo:</em> {change.newValue || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td>{getResponseDate(response)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-primary compact" type="button" disabled={!responseId || isProcessing} onClick={() => onApprove(response)}>
                      Aprobar
                    </button>
                    <button className="btn btn-secondary compact" type="button" disabled={!responseId || isProcessing} onClick={() => onReject(response)}>
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!responses.length ? <EmptyState title="Sin respuestas pendientes" description="No hay formularios de clientes por revisar." /> : null}
    </div>
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
  const converted = status === "convertido";

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="tag-row">
            <span className="badge tone-blue">Prospecto</span>
            <ProspectStatusBadge status={prospect.status} />
            {prospect.segment ? <span className="badge">{prospect.segment}</span> : <span className="badge tone-amber">Segmento pendiente</span>}
          </div>
          <h2>{prospect.name}</h2>
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
            <span>{prospect.name}</span>
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

function normalizeStatus(status?: string | null): CompanyStatus {
  return COMPANY_STATUSES.includes(status as CompanyStatus) ? (status as CompanyStatus) : "nuevo";
}

function normalizeProspectStatus(status?: string | null): ProspectStatus {
  return PROSPECT_STATUSES.includes(status as ProspectStatus) ? (status as ProspectStatus) : "nuevo";
}

function formatActivityType(type: ActivityType | string) {
  return activityTypeLabels[type as ActivityType] || type || "Actividad";
}

function formatContactRole(role?: string | null) {
  const normalized = role?.toLowerCase().trim();
  if (!normalized) return "Rol pendiente";
  if (normalized.includes("compra")) return "Contacto de compras";
  if (normalized.includes("chef") || normalized.includes("cocina")) return "Contacto de cocina/chef";
  if (normalized.includes("pago") || normalized.includes("tesorer") || normalized.includes("factur")) return "Contacto de pagos";
  return role || "Rol pendiente";
}

function getContactIssues(contact: Contact) {
  const issues: string[] = [];
  if (!contact.email?.trim()) issues.push("Sin email");
  if (!contact.role?.trim()) issues.push("Rol pendiente");
  if (!contact.phone?.trim()) issues.push("Teléfono pendiente");
  if (contact.email?.trim() && hasMultipleOrInvalidEmail(contact.email)) issues.push("Email múltiple o inválido");
  return issues;
}

function hasMultipleOrInvalidEmail(email: string) {
  const parts = email.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return true;
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getCompanyIssues(company: Company) {
  const issues: string[] = [];
  if (normalizeStatus(company.status) === "por validar") issues.push("Datos pendientes de validar");
  if (!company.nit?.trim()) issues.push("NIT pendiente");
  if (!company.phone?.trim()) issues.push("Teléfono pendiente");
  if (!company.address?.trim()) issues.push("Dirección de entrega pendiente");
  return issues;
}

function isInFollowUp(company: Company) {
  return ["contactado", "interesado", "cotizado"].includes(normalizeStatus(company.status));
}

function isOverdue(activity: { due_date: string | null; completed: boolean | null }) {
  if (!activity.due_date || activity.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${activity.due_date}T00:00:00`) < today;
}

function getNextActivity(activities: Activity[]) {
  return activities
    .filter((activity) => !activity.completed)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })[0] || null;
}

function getNextProspectActivity(activities: ProspectActivity[]) {
  return activities
    .filter((activity) => !activity.completed)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })[0] || null;
}

function buildConvertedProspectNotes(prospect: Prospect) {
  const details = [
    "Convertido desde prospeccion.",
    prospect.source ? `Origen: ${prospect.source}.` : "",
    prospect.contact_name ? `Contacto prospecto: ${prospect.contact_name}.` : "",
    prospect.contact_email ? `Email prospecto: ${prospect.contact_email}.` : "",
    prospect.contact_phone ? `Telefono prospecto: ${prospect.contact_phone}.` : "",
    prospect.notes || "",
  ].filter(Boolean);

  return details.join("\n");
}

function countByStatus(companies: Company[], status: CompanyStatus) {
  return companies.filter((company) => normalizeStatus(company.status) === status).length;
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function filterDataIssues(issues: DataIssueGroup[], normalizedSearch: string) {
  if (!normalizedSearch) return issues;
  return issues.filter((issue) =>
    [issue.title, issue.subtitle, issue.type, ...issue.issues].some((value) => value.toLowerCase().includes(normalizedSearch))
  );
}

function filterCustomerResponses(responses: CustomerUpdateResponse[], normalizedSearch: string) {
  if (!normalizedSearch) return responses;

  return responses.filter((response) => {
    const changes = getResponseChanges(response);
    return [
      getResponseCustomerName(response),
      getResponseSubtitle(response),
      getResponseDate(response),
      ...changes.flatMap((change) => [change.label, change.currentValue, change.newValue]),
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

function getResponseId(response: CustomerUpdateResponse) {
  const value = response.response_id ?? response.id;
  return value === null || value === undefined ? "" : String(value);
}

function getResponsePayload(response: CustomerUpdateResponse) {
  return isRecord(response.payload) ? response.payload : {};
}

function getResponseCustomerName(response: CustomerUpdateResponse) {
  return (
    readResponseValue(response, ["nombre_cliente", "company_name", "cliente_nombre", "name"]) ||
    "Cliente sin nombre"
  );
}

function getResponseSubtitle(response: CustomerUpdateResponse) {
  return readResponseValue(response, ["cliente_id", "company_id", "nit", "segmento"]) || "Formulario público";
}

function getResponseDate(response: CustomerUpdateResponse) {
  return readResponseValue(response, ["submitted_at", "created_at", "updated_at"]) || "-";
}

function getResponseChanges(response: CustomerUpdateResponse): CustomerUpdateChange[] {
  const fields = [
    { label: "Razón social", current: ["razon_social_actual", "razon_social", "legal_name"], next: ["razon_social_nueva"] },
    { label: "NIT", current: ["nit_actual", "nit"], next: ["nit_nuevo"] },
    { label: "Contacto comercial", current: ["contacto_actual", "contacto_comercial_actual"], next: ["contacto_comercial_nuevo"] },
    { label: "Cargo contacto", current: ["cargo_contacto_actual", "rol_actual"], next: ["cargo_contacto_nuevo"] },
    { label: "Teléfono comercial", current: ["telefono_actual", "celular_comercial_actual"], next: ["celular_comercial_nuevo"] },
    { label: "Correo comercial", current: ["correo_actual", "correo_comercial_actual"], next: ["correo_comercial_nuevo"] },
    { label: "Contacto de pagos", current: ["contacto_pagos_actual"], next: ["contacto_pagos_nuevo"] },
    { label: "Cargo pagos", current: ["cargo_pagos_actual"], next: ["cargo_pagos_nuevo"] },
    { label: "Teléfono tesorería", current: ["telefono_tesoreria_actual"], next: ["telefono_tesoreria_nuevo"] },
    { label: "Correo tesorería", current: ["correo_tesoreria_actual"], next: ["correo_tesoreria_nuevo"] },
    { label: "Correo facturación", current: ["correo_facturacion_actual"], next: ["correo_facturacion_nuevo"] },
    { label: "Dirección", current: ["direccion_actual", "address"], next: ["direccion_nueva"] },
    { label: "Observaciones", current: [], next: ["observaciones_cliente"] },
  ];

  const changes = fields
    .map((field) => {
      const currentValue = readResponseValue(response, field.current);
      const newValue = readResponseValue(response, field.next);
      return { label: field.label, currentValue, newValue };
    })
    .filter((change) => change.newValue && normalizeComparable(change.currentValue) !== normalizeComparable(change.newValue));

  if (changes.length) return changes;

  if (readResponseValue(response, ["confirm_no_changes"]) === "true") {
    return [{ label: "Confirmación", currentValue: "Datos registrados", newValue: "Cliente confirma sin cambios" }];
  }

  return [{ label: "Respuesta", currentValue: "-", newValue: "Sin diferencias detectadas en campos conocidos" }];
}

function readResponseValue(response: CustomerUpdateResponse, keys: string[]) {
  const payload = getResponsePayload(response);

  for (const key of keys) {
    const direct = response[key];
    if (direct !== null && direct !== undefined && String(direct).trim()) return String(direct);

    const payloadValue = payload[key];
    if (payloadValue !== null && payloadValue !== undefined && String(payloadValue).trim()) return String(payloadValue);
  }

  return "";
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPageTitle(viewMode: ViewMode) {
  if (viewMode === "home") return "Resumen comercial";
  if (viewMode === "prospecting") return "Prospección";
  if (viewMode === "contacts") return "Directorio comercial";
  if (viewMode === "activities") return "Agenda de seguimiento";
  if (viewMode === "data") return "Datos pendientes de validar";
  return "Clientes actuales";
}

function getViewTitle(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Prospección";
  if (viewMode === "contacts") return "Contactos comerciales";
  if (viewMode === "activities") return "Seguimiento";
  if (viewMode === "data") return "Actualización de datos";
  return "Clientes";
}

function getViewHeading(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Prospectos";
  if (viewMode === "contacts") return "Contactos comerciales";
  if (viewMode === "activities") return "Agenda de seguimiento";
  if (viewMode === "data") return "Datos pendientes de validar";
  return "Base de clientes";
}

function getSearchPlaceholder(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Buscar prospecto, contacto, origen o segmento";
  if (viewMode === "contacts") return "Buscar contacto, cliente, rol o email";
  if (viewMode === "activities") return "Buscar cliente, seguimiento o nota";
  if (viewMode === "data") return "Buscar pendiente, cliente o contacto";
  return "Buscar por cliente, NIT, ciudad o segmento";
}

function getResultCount(
  viewMode: ViewMode,
  companies: Company[],
  contacts: Contact[],
  activities: Activity[],
  dataIssues: DataIssueGroup[],
  customerResponses: CustomerUpdateResponse[],
  dataTab: DataTab,
  prospects: Prospect[]
) {
  if (viewMode === "prospecting") return prospects.length;
  if (viewMode === "contacts") return contacts.length;
  if (viewMode === "activities") return activities.length;
  if (viewMode === "data") return dataTab === "responses" ? customerResponses.length : dataIssues.length;
  return companies.length;
}
