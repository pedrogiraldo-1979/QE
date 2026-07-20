"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Target,
  UsersRound,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { HOME_ACTIVITY_FEED_LIMIT, REFERENCE_ENTITY_LIMIT } from "@/lib/data/queryLimits";

type CompanyRow = {
  id: string;
  name: string | null;
  segment: string | null;
  status: string | null;
  phone: string | null;
  website: string | null;
  nit: string | null;
};

type ContactRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  full_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
};

type ActivityRow = {
  id: string;
  company_id: string | null;
  activity_type: string | null;
  notes: string | null;
  due_date: string | null;
  completed: boolean | null;
};

type ProspectRow = {
  id: string;
  company_name: string | null;
  segment: string | null;
  status: string | null;
  priority: string | null;
};

type WorkbenchData = {
  companies: CompanyRow[];
  contacts: ContactRow[];
  activities: ActivityRow[];
  prospects: ProspectRow[];
};

type WorkItem = {
  priority: "Alta" | "Media";
  type: string;
  title: string;
  detail: string;
  action: string;
  actionKind: "activities" | "contacts" | "companies" | "data" | "prospects";
};

const emptyData: WorkbenchData = {
  companies: [],
  contacts: [],
  activities: [],
  prospects: [],
};

const blockedProspectStatuses = new Set(["cliente_actual_excluir", "descartado", "convertido", "convertido_cliente"]);

export default function HomeCommercialWorkbench() {
  const supabase = getSupabaseClient();
  const [active, setActive] = useState(false);
  const [container, setContainer] = useState<Element | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorkbenchData>(emptyData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateActiveState = () => {
      const workspace = document.querySelector(".workspace");
      const activeNavText = document.querySelector(".sidebar-nav .nav-button.active span")?.textContent?.trim();
      const shouldShow = window.location.pathname === "/" && activeNavText === "Inicio" && Boolean(workspace);
      setContainer(workspace);
      setActive(shouldShow);
      document.body.classList.toggle("home-workbench-active", shouldShow);
    };

    updateActiveState();
    const observer = new MutationObserver(updateActiveState);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("popstate", updateActiveState);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", updateActiveState);
      document.body.classList.remove("home-workbench-active");
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadWorkbenchData();
  }, [active]);

  async function loadWorkbenchData() {
    setLoading(true);
    setError(null);

    const [companiesResult, contactsResult, activitiesResult, prospectsResult] = await Promise.all([
      supabase.from("companies").select("id,name,segment,status,phone,website,nit").order("name", { ascending: true }),
      supabase.from("contacts").select("id,company_id,company_name,full_name,role,email,phone").order("company_name", { ascending: true }),
      supabase
        .from("activities")
        .select("id,company_id,activity_type,notes,due_date,completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(HOME_ACTIVITY_FEED_LIMIT),
      supabase
        .from("prospects")
        .select("id,company_name,segment,status,priority")
        .order("company_name", { ascending: true })
        .limit(REFERENCE_ENTITY_LIMIT),
    ]);

    if (companiesResult.error || contactsResult.error || activitiesResult.error || prospectsResult.error) {
      setError(
        companiesResult.error?.message ||
          contactsResult.error?.message ||
          activitiesResult.error?.message ||
          prospectsResult.error?.message ||
          "No pudimos cargar el centro de trabajo."
      );
      setLoading(false);
      return;
    }

    setData({
      companies: (companiesResult.data || []) as CompanyRow[],
      contacts: (contactsResult.data || []) as ContactRow[],
      activities: (activitiesResult.data || []) as ActivityRow[],
      prospects: (prospectsResult.data || []) as ProspectRow[],
    });
    setLoading(false);
  }

  const overdueActivities = useMemo(() => data.activities.filter(isOverdue), [data.activities]);
  const contactsWithoutEmail = useMemo(() => data.contacts.filter((contact) => !contact.email?.trim()), [data.contacts]);
  const contactsWithoutRole = useMemo(() => data.contacts.filter((contact) => !contact.role?.trim()), [data.contacts]);
  const companiesWithDataIssues = useMemo(() => data.companies.filter(hasCompanyDataIssue), [data.companies]);
  const activeProspects = useMemo(
    () => data.prospects.filter((prospect) => !blockedProspectStatuses.has(normalizeValue(prospect.status))),
    [data.prospects]
  );
  const prospectsToReview = useMemo(
    () => activeProspects.filter((prospect) => ["por_validar", "por_revisar", "nuevo"].includes(normalizeValue(prospect.status))).slice(0, 3),
    [activeProspects]
  );

  const workItems = useMemo<WorkItem[]>(() => {
    const items: WorkItem[] = [];

    overdueActivities.slice(0, 3).forEach((activity) => {
      const company = data.companies.find((item) => item.id === activity.company_id);
      items.push({
        priority: "Alta",
        type: "Seguimiento",
        title: company?.name || "Cliente sin nombre",
        detail: activity.due_date ? `Vencido desde ${activity.due_date}` : "Seguimiento vencido",
        action: "Abrir actividades",
        actionKind: "activities",
      });
    });

    contactsWithoutEmail.slice(0, 3).forEach((contact) => {
      items.push({
        priority: "Alta",
        type: "Contacto",
        title: contact.full_name || "Contacto sin nombre",
        detail: `${contact.company_name || "Cliente pendiente"} · falta email`,
        action: "Completar contacto",
        actionKind: "contacts",
      });
    });

    contactsWithoutRole.slice(0, 2).forEach((contact) => {
      items.push({
        priority: "Media",
        type: "Rol",
        title: contact.full_name || "Contacto sin nombre",
        detail: `${contact.company_name || "Cliente pendiente"} · falta rol comercial`,
        action: "Revisar contactos",
        actionKind: "contacts",
      });
    });

    prospectsToReview.forEach((prospect) => {
      items.push({
        priority: "Media",
        type: "Prospecto",
        title: prospect.company_name || "Prospecto sin nombre",
        detail: `${prospect.segment || "Sin segmento"} · pendiente de validación`,
        action: "Revisar prospección",
        actionKind: "prospects",
      });
    });

    return items.slice(0, 8);
  }, [contactsWithoutEmail, contactsWithoutRole, data.companies, overdueActivities, prospectsToReview]);

  if (!active || !container) return null;

  return createPortal(
    <section className="commercial-workbench" aria-label="Centro de trabajo comercial">
      <div className="workbench-hero">
        <div>
          <p className="panel-kicker">Centro de trabajo comercial</p>
          <h2>Qué atender primero</h2>
          <p>Vista operativa para priorizar seguimiento, completar datos y revisar prospección sin duplicar métricas.</p>
        </div>
        <div className="workbench-actions">
          <Link className="btn btn-primary" href="/prospectos">
            <Target size={17} />
            Revisar prospección
          </Link>
          <button className="btn btn-secondary" type="button" onClick={() => void loadWorkbenchData()} disabled={loading}>
            {loading ? "Actualizando" : "Actualizar"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-info">{error}</div> : null}

      <div className="workbench-priority-grid">
        <PriorityCard icon={CalendarClock} label="Seguimientos vencidos" value={overdueActivities.length} helper="abrir antes de nuevas ventas" urgent onClick={() => openInternalView("Actividades")} />
        <PriorityCard icon={Mail} label="Contactos sin email" value={contactsWithoutEmail.length} helper="bloquean campañas y cotizaciones" urgent onClick={() => openInternalView("Contactos")} />
        <PriorityCard icon={UsersRound} label="Roles pendientes" value={contactsWithoutRole.length} helper="compras, cocina o pagos por identificar" onClick={() => openInternalView("Contactos")} />
        <PriorityCard icon={ClipboardCheck} label="Datos por validar" value={companiesWithDataIssues.length} helper="clientes con campos incompletos" onClick={() => openInternalView("Actualización de datos")} />
      </div>

      <div className="workbench-main-grid">
        <section className="workbench-card workbench-task-list">
          <div className="workbench-section-title">
            <div>
              <p className="panel-kicker">Lista de trabajo</p>
              <h3>Próximas acciones sugeridas</h3>
            </div>
            <span>{workItems.length}</span>
          </div>

          {workItems.length ? (
            <div className="work-items">
              {workItems.map((item, index) => (
                <button className="work-item" key={`${item.type}-${item.title}-${index}`} type="button" onClick={() => openWorkItem(item)}>
                  <span className={`work-priority ${item.priority === "Alta" ? "urgent" : ""}`}>{item.priority}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.type} · {item.detail}</small>
                  </span>
                  <em>{item.action}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="workbench-empty">
              <CheckCircle2 size={18} />
              No hay bloqueos críticos en este momento.
            </div>
          )}
        </section>

        <aside className="workbench-card">
          <div className="workbench-section-title">
            <div>
              <p className="panel-kicker">Accesos rápidos</p>
              <h3>Trabajo frecuente</h3>
            </div>
          </div>
          <div className="quick-actions-list">
            <button type="button" onClick={() => openInternalView("Clientes")}><Building2 size={16} /> Clientes actuales <span>{data.companies.length}</span></button>
            <button type="button" onClick={() => openInternalView("Contactos")}><UsersRound size={16} /> Contactos comerciales <span>{data.contacts.length}</span></button>
            <Link href="/prospectos"><Target size={16} /> Prospección <span>{activeProspects.length}</span></Link>
            <button type="button" onClick={() => openInternalView("Actividades")}><CalendarClock size={16} /> Actividades vencidas <span>{overdueActivities.length}</span></button>
          </div>
        </aside>
      </div>
    </section>,
    container
  );
}

function PriorityCard({
  icon: Icon,
  label,
  value,
  helper,
  urgent = false,
  onClick,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  helper: string;
  urgent?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`workbench-priority-card ${urgent && value ? "urgent" : ""}`} type="button" onClick={onClick}>
      <span className="metric-icon"><Icon size={18} /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{helper}</em>
      </span>
    </button>
  );
}

function openWorkItem(item: WorkItem) {
  if (item.actionKind === "prospects") {
    window.location.assign("/prospectos");
    return;
  }

  const labelByKind: Record<Exclude<WorkItem["actionKind"], "prospects">, string> = {
    activities: "Actividades",
    contacts: "Contactos",
    companies: "Clientes",
    data: "Actualización de datos",
  };

  openInternalView(labelByKind[item.actionKind]);
}

function openInternalView(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".sidebar-nav .nav-button"));
  const target = buttons.find((button) => button.textContent?.includes(label));
  target?.click();
}

function isOverdue(activity: ActivityRow) {
  if (activity.completed || !activity.due_date) return false;
  return activity.due_date < new Date().toISOString().slice(0, 10);
}

function hasCompanyDataIssue(company: CompanyRow) {
  return !company.name?.trim() || !company.segment?.trim() || !company.phone?.trim() || !company.nit?.trim();
}

function normalizeValue(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}
