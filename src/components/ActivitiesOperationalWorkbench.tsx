"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
  RefreshCw,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { OPERATIONAL_ACTIVITY_FEED_LIMIT, REFERENCE_ENTITY_LIMIT } from "@/lib/data/queryLimits";

type CompanyRow = {
  id: string;
  name: string | null;
  segment: string | null;
};

type ProspectRow = {
  id: string;
  company_name: string | null;
  segment: string | null;
};

type RawActivityRow = {
  id: string;
  company_id?: string | null;
  prospect_id?: string | null;
  contact_id?: string | null;
  activity_type: string | null;
  notes: string | null;
  activity_date: string | null;
  due_date: string | null;
  completed: boolean | null;
  created_at: string | null;
};

type ActivitySource = "cliente" | "prospecto";

type ActivityItem = RawActivityRow & {
  source: ActivitySource;
  relatedName: string;
  relatedSubtitle: string;
};

type WorkbenchData = {
  companies: CompanyRow[];
  prospects: ProspectRow[];
  activities: RawActivityRow[];
  prospectActivities: RawActivityRow[];
};

const emptyData: WorkbenchData = {
  companies: [],
  prospects: [],
  activities: [],
  prospectActivities: [],
};

const activityLabels: Record<string, string> = {
  note: "Nota",
  call: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  follow_up: "Seguimiento",
  meeting: "Reunión",
};

export default function ActivitiesOperationalWorkbench() {
  const supabase = getSupabaseClient();
  const [active, setActive] = useState(false);
  const [container, setContainer] = useState<Element | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<WorkbenchData>(emptyData);

  useEffect(() => {
    const updateActiveState = () => {
      const workspace = document.querySelector(".workspace");
      const activeNavText = document.querySelector(".sidebar-nav .nav-button.active span")?.textContent?.trim();
      const shouldShow = window.location.pathname === "/" && activeNavText === "Actividades" && Boolean(workspace);
      setContainer(workspace);
      setActive(shouldShow);
      document.body.classList.toggle("activities-workbench-active", shouldShow);
    };

    updateActiveState();
    const observer = new MutationObserver(updateActiveState);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("popstate", updateActiveState);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", updateActiveState);
      document.body.classList.remove("activities-workbench-active");
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadActivities();
  }, [active]);

  async function loadActivities() {
    setLoading(true);
    setMessage(null);

    const [companiesResult, prospectsResult, activitiesResult, prospectActivitiesResult] = await Promise.all([
      supabase.from("companies").select("id,name,segment").order("name", { ascending: true }),
      supabase
        .from("prospects")
        .select("id,company_name,segment")
        .order("company_name", { ascending: true })
        .limit(REFERENCE_ENTITY_LIMIT),
      supabase
        .from("activities")
        .select("id,company_id,contact_id,activity_type,notes,activity_date,due_date,completed,created_at")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(OPERATIONAL_ACTIVITY_FEED_LIMIT),
      supabase
        .from("prospect_activities")
        .select("id,prospect_id,contact_id,activity_type,notes,activity_date,due_date,completed,created_at")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(OPERATIONAL_ACTIVITY_FEED_LIMIT),
    ]);

    if (companiesResult.error || prospectsResult.error || activitiesResult.error || prospectActivitiesResult.error) {
      setMessage(
        companiesResult.error?.message ||
          prospectsResult.error?.message ||
          activitiesResult.error?.message ||
          prospectActivitiesResult.error?.message ||
          "No pudimos cargar actividades."
      );
      setLoading(false);
      return;
    }

    setData({
      companies: (companiesResult.data || []) as CompanyRow[],
      prospects: (prospectsResult.data || []) as ProspectRow[],
      activities: (activitiesResult.data || []) as RawActivityRow[],
      prospectActivities: (prospectActivitiesResult.data || []) as RawActivityRow[],
    });
    setLoading(false);
  }

  const companyById = useMemo(() => new Map(data.companies.map((company) => [company.id, company])), [data.companies]);
  const prospectById = useMemo(() => new Map(data.prospects.map((prospect) => [prospect.id, prospect])), [data.prospects]);

  const allActivities = useMemo<ActivityItem[]>(() => {
    const customerItems = data.activities.map((activity) => {
      const company = activity.company_id ? companyById.get(activity.company_id) : null;
      return {
        ...activity,
        source: "cliente" as const,
        relatedName: company?.name || "Cliente sin nombre",
        relatedSubtitle: company?.segment || "Cliente actual",
      };
    });

    const prospectItems = data.prospectActivities.map((activity) => {
      const prospect = activity.prospect_id ? prospectById.get(activity.prospect_id) : null;
      return {
        ...activity,
        source: "prospecto" as const,
        relatedName: prospect?.company_name || "Prospecto sin nombre",
        relatedSubtitle: prospect?.segment || "Prospecto",
      };
    });

    return [...customerItems, ...prospectItems].sort(sortActivities);
  }, [companyById, data.activities, data.prospectActivities, prospectById]);

  const today = new Date().toISOString().slice(0, 10);
  const nextSevenDate = addDays(7);
  const weekAgo = addDays(-7);

  const pendingActivities = allActivities.filter((activity) => !activity.completed);
  const overdue = pendingActivities.filter((activity) => activity.due_date && activity.due_date < today);
  const dueToday = pendingActivities.filter((activity) => activity.due_date === today);
  const nextSeven = pendingActivities.filter((activity) => activity.due_date && activity.due_date > today && activity.due_date <= nextSevenDate);
  const noDate = pendingActivities.filter((activity) => !activity.due_date);
  const completedThisWeek = allActivities.filter((activity) => activity.completed && (activity.activity_date || activity.created_at || "") >= weekAgo);
  const activeQueue = [...overdue, ...dueToday, ...nextSeven, ...noDate].slice(0, 12);

  async function completeActivity(activity: ActivityItem) {
    const table = activity.source === "prospecto" ? "prospect_activities" : "activities";
    const { error } = await supabase.from(table).update({ completed: true }).eq("id", activity.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Actividad completada.");
    void loadActivities();
  }

  async function rescheduleActivity(activity: ActivityItem) {
    const nextDate = window.prompt("Nueva fecha de vencimiento (YYYY-MM-DD)", activity.due_date || today);
    if (!nextDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      setMessage("Usa formato YYYY-MM-DD.");
      return;
    }

    const table = activity.source === "prospecto" ? "prospect_activities" : "activities";
    const { error } = await supabase.from(table).update({ due_date: nextDate, completed: false }).eq("id", activity.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Actividad reprogramada.");
    void loadActivities();
  }

  if (!active || !container) return null;

  return createPortal(
    <section className="activities-workbench" aria-label="Actividades operativas">
      <div className="activities-hero">
        <div>
          <p className="panel-kicker">Actividades operativas</p>
          <h2>Qué tareas requieren atención</h2>
          <p>Cola diaria para llamadas, WhatsApp, emails y seguimientos antes de conectar calendarios de Juliana y Sandra.</p>
        </div>
        <div className="activities-hero-actions">
          <button className="btn btn-secondary" type="button" onClick={() => void loadActivities()} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            {loading ? "Actualizando" : "Actualizar"}
          </button>
        </div>
      </div>

      {message ? <div className="alert alert-info">{message}</div> : null}

      <div className="activity-kpi-grid">
        <ActivityKpi icon={Clock3} label="Vencidas" value={overdue.length} helper="requieren acción inmediata" urgent={overdue.length > 0} />
        <ActivityKpi icon={CalendarClock} label="Hoy" value={dueToday.length} helper="plan del día" />
        <ActivityKpi icon={ListChecks} label="Próximos 7 días" value={nextSeven.length} helper="seguimientos programados" />
        <ActivityKpi icon={UserRound} label="Sin fecha" value={noDate.length} helper="requieren programación" />
        <ActivityKpi icon={CheckCircle2} label="Completadas" value={completedThisWeek.length} helper="esta semana" />
      </div>

      <div className="activities-main-grid">
        <section className="activity-card">
          <div className="activity-section-title">
            <div>
              <p className="panel-kicker">Cola activa</p>
              <h3>Pendientes por ejecutar</h3>
            </div>
            <span>{activeQueue.length}</span>
          </div>

          <div className="activity-list">
            {activeQueue.map((activity) => (
              <article className={`activity-row ${getActivityUrgency(activity)}`} key={`${activity.source}-${activity.id}`}>
                <div className="activity-date-pill">
                  <strong>{formatDueDate(activity.due_date)}</strong>
                  <span>{getActivityBucket(activity)}</span>
                </div>
                <div className="activity-main-copy">
                  <strong>{activity.relatedName}</strong>
                  <span>{formatActivityType(activity.activity_type)} · {activity.relatedSubtitle}</span>
                  <small>{activity.notes || "Sin nota registrada"}</small>
                </div>
                <div className="activity-source-pill">{activity.source}</div>
                <div className="activity-row-actions">
                  <button className="btn btn-primary compact" type="button" onClick={() => void completeActivity(activity)}>
                    Completar
                  </button>
                  <button className="btn btn-secondary compact" type="button" onClick={() => void rescheduleActivity(activity)}>
                    <RotateCcw size={13} />
                    Reprogramar
                  </button>
                </div>
              </article>
            ))}
            {!activeQueue.length ? (
              <div className="activities-empty">
                <CheckCircle2 size={18} />
                No hay actividades pendientes en este momento.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="activity-card activity-calendar-readiness">
          <div className="activity-section-title">
            <div>
              <p className="panel-kicker">Calendario futuro</p>
              <h3>Preparar integración</h3>
            </div>
            <History size={18} />
          </div>
          <div className="readiness-list">
            <div><strong>Responsable</strong><span>Pendiente: Juliana / Sandra.</span></div>
            <div><strong>Fecha y hora</strong><span>Hoy usamos fecha; después conviene hora exacta.</span></div>
            <div><strong>Sincronización</strong><span>Guardar calendar_event_id cuando conectemos Google Calendar.</span></div>
            <div><strong>Alertas</strong><span>Activar recordatorios cuando haya responsable y fecha.</span></div>
          </div>
        </aside>
      </div>
    </section>,
    container
  );
}

function ActivityKpi({
  icon: Icon,
  label,
  value,
  helper,
  urgent = false,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  helper: string;
  urgent?: boolean;
}) {
  return (
    <article className={`activity-kpi ${urgent ? "urgent" : ""}`}>
      <span className="metric-icon"><Icon size={18} /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{helper}</em>
      </span>
    </article>
  );
}

function sortActivities(a: ActivityItem, b: ActivityItem) {
  if (!a.completed && b.completed) return -1;
  if (a.completed && !b.completed) return 1;
  const aDate = a.due_date || "9999-12-31";
  const bDate = b.due_date || "9999-12-31";
  return aDate.localeCompare(bDate);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatActivityType(type: string | null) {
  return activityLabels[type || ""] || "Actividad";
}

function formatDueDate(date: string | null) {
  if (!date) return "Sin fecha";
  return date.slice(5);
}

function getActivityBucket(activity: ActivityItem) {
  const today = new Date().toISOString().slice(0, 10);
  const nextSevenDate = addDays(7);
  if (!activity.due_date) return "programar";
  if (activity.due_date < today) return "vencida";
  if (activity.due_date === today) return "hoy";
  if (activity.due_date <= nextSevenDate) return "próxima";
  return "futura";
}

function getActivityUrgency(activity: ActivityItem) {
  const bucket = getActivityBucket(activity);
  return bucket === "vencida" ? "urgent" : bucket === "hoy" ? "today" : "";
}
