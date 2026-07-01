"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ACTIVITY_TYPES,
  COMPANY_STATUSES,
  type Activity,
  type ActivityType,
  type Company,
  type CompanyStatus,
  type Contact,
} from "@/lib/types";

type ViewMode = "companies" | "contacts" | "activities";

interface DashboardData {
  companies: Company[];
  contacts: Contact[];
  activities: Activity[];
}

const initialData: DashboardData = {
  companies: [],
  contacts: [],
  activities: [],
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
  const [viewMode, setViewMode] = useState<ViewMode>("companies");
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityType, setNewActivityType] = useState<ActivityType>("follow_up");
  const [newActivityDueDate, setNewActivityDueDate] = useState("");
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

    const [companiesResult, contactsResult, activitiesResult] = await Promise.all([
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("contacts").select("*").order("company_name", { ascending: true }),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
    ]);

    if (companiesResult.error || contactsResult.error || activitiesResult.error) {
      setMessage(
        companiesResult.error?.message || contactsResult.error?.message || activitiesResult.error?.message || "Error loading data."
      );
      setLoading(false);
      return;
    }

    const companies = (companiesResult.data || []) as Company[];
    const contacts = (contactsResult.data || []) as Contact[];
    const activities = (activitiesResult.data || []) as Activity[];

    setData({ companies, contacts, activities });
    setSelectedCompanyId((current) => current || companies[0]?.id || null);
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
    setData(initialData);
    setSelectedCompanyId(null);
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
    setMessage("Estado actualizado.");
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

    setData((current) => ({
      ...current,
      activities: [inserted as Activity, ...current.activities],
    }));
    setNewActivityNotes("");
    setNewActivityDueDate("");
    setNewActivityType("follow_up");
    setMessage("Actividad creada.");
  }

  async function toggleActivityCompleted(activity: Activity) {
    const completed = !activity.completed;

    const { error } = await supabase
      .from("activities")
      .update({ completed })
      .eq("id", activity.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      activities: current.activities.map((item) => (item.id === activity.id ? { ...item, completed } : item)),
    }));
    setMessage(completed ? "Actividad completada." : "Actividad reabierta.");
  }

  const segments = useMemo(() => {
    return Array.from(new Set(data.companies.map((company) => company.segment).filter(Boolean) as string[])).sort();
  }, [data.companies]);

  const selectedCompany = useMemo(() => {
    return data.companies.find((company) => company.id === selectedCompanyId) || data.companies[0] || null;
  }, [data.companies, selectedCompanyId]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.companies.filter((company) => {
      const matchesSearch =
        !normalizedSearch ||
        [company.name, company.legal_name, company.nit, company.city, company.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesSegment = segmentFilter === "todos" || company.segment === segmentFilter;
      const matchesStatus = statusFilter === "todos" || company.status === statusFilter;

      return matchesSearch && matchesSegment && matchesStatus;
    });
  }, [data.companies, search, segmentFilter, statusFilter]);

  const selectedContacts = useMemo(() => {
    if (!selectedCompany) return [];
    return data.contacts.filter((contact) => contact.company_id === selectedCompany.id);
  }, [data.contacts, selectedCompany]);

  const selectedActivities = useMemo(() => {
    if (!selectedCompany) return [];
    return data.activities.filter((activity) => activity.company_id === selectedCompany.id);
  }, [data.activities, selectedCompany]);

  const contactsWithoutEmail = data.contacts.filter((contact) => !contact.email?.trim()).length;
  const contactsWithMultipleEmails = data.contacts.filter((contact) => contact.email?.includes(";")).length;
  const followUpsPending = data.activities.filter((activity) => !activity.completed && activity.due_date).length;

  if (!sessionReady) {
    return <CenteredMessage title="Cargando CRM" description="Validando sesión..." />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen px-4 py-10">
        <section className="mx-auto max-w-md card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Quindío Exquisito</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">CRM MVP</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Inicia sesión con un usuario creado en Supabase Auth. La base usa RLS, así que solo usuarios autenticados pueden ver y editar datos.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <label className="block text-sm font-bold">
              Email
              <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-bold">
              Password
              <input
                className="input mt-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
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
      <header className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Quindío Exquisito</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">CRM de prospección</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Empresas, contactos y seguimiento comercial desde Supabase.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => void handleSignOut()}>
            Salir
          </button>
        </div>
      </header>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Empresas" value={data.companies.length} />
        <MetricCard label="Contactos" value={data.contacts.length} />
        <MetricCard label="Sin email" value={contactsWithoutEmail} />
        <MetricCard label="Emails múltiples" value={contactsWithMultipleEmails} />
        <MetricCard label="Seguimientos" value={followUpsPending} />
      </section>

      {message ? (
        <section className="mx-auto mt-4 max-w-7xl rounded-xl border border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">
          {message}
        </section>
      ) : null}

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex flex-wrap gap-2">
              <button className={`btn ${viewMode === "companies" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("companies")}>
                Empresas
              </button>
              <button className={`btn ${viewMode === "contacts" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("contacts")}>
                Contactos
              </button>
              <button className={`btn ${viewMode === "activities" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("activities")}>
                Actividades
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <input
                className="input"
                placeholder="Buscar por nombre, NIT, dirección..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select className="select" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
                <option value="todos">Todos los segmentos</option>
                {segments.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="todos">Todos los estados</option>
                {COMPANY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {viewMode === "companies" ? (
            <CompanyTable companies={filteredCompanies} selectedCompanyId={selectedCompany?.id || null} onSelect={setSelectedCompanyId} />
          ) : null}
          {viewMode === "contacts" ? <ContactsTable contacts={data.contacts} onSelectCompany={setSelectedCompanyId} /> : null}
          {viewMode === "activities" ? <ActivitiesTable activities={data.activities} companies={data.companies} /> : null}
        </div>

        <aside className="card p-5">
          {selectedCompany ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge">{selectedCompany.segment || "sin segmento"}</span>
                    <span className="badge">{selectedCompany.status || "nuevo"}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{selectedCompany.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedCompany.legal_name || "Sin razón social"}</p>
                </div>
                <select
                  className="select max-w-44"
                  value={selectedCompany.status || "nuevo"}
                  onChange={(event) => void updateCompanyStatus(selectedCompany, event.target.value as CompanyStatus)}
                >
                  {COMPANY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <DetailItem label="NIT" value={selectedCompany.nit} />
                <DetailItem label="Ciudad" value={selectedCompany.city} />
                <DetailItem label="Teléfono" value={selectedCompany.phone} />
                <DetailItem label="Dirección" value={selectedCompany.address} />
                <DetailItem label="Website" value={selectedCompany.website} isLink />
              </dl>

              {selectedCompany.notes ? (
                <div className="mt-5 rounded-xl bg-[#f4f7f2] p-4 text-sm leading-6 text-[var(--muted)]">
                  <strong className="text-[var(--foreground)]">Notas: </strong>
                  {selectedCompany.notes}
                </div>
              ) : null}

              <section className="mt-6">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--muted)]">Contactos</h3>
                <div className="mt-3 space-y-3">
                  {selectedContacts.length ? (
                    selectedContacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No hay contactos para esta empresa.</p>
                  )}
                </div>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--muted)]">Nueva actividad</h3>
                <form className="mt-3 space-y-3" onSubmit={addActivity}>
                  <select className="select" value={newActivityType} onChange={(event) => setNewActivityType(event.target.value as ActivityType)}>
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="textarea min-h-24"
                    placeholder="Ej. Llamar a compras para validar volumen mensual de café."
                    value={newActivityNotes}
                    onChange={(event) => setNewActivityNotes(event.target.value)}
                  />
                  <input className="input" type="date" value={newActivityDueDate} onChange={(event) => setNewActivityDueDate(event.target.value)} />
                  <button className="btn btn-primary w-full" type="submit">
                    Guardar actividad
                  </button>
                </form>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--muted)]">Historial</h3>
                <div className="mt-3 space-y-3">
                  {selectedActivities.length ? (
                    selectedActivities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} onToggle={toggleActivityCompleted} />
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Todavía no hay actividades.</p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <CenteredMessage title="Sin empresa seleccionada" description="Selecciona una empresa para ver el detalle." />
          )}
        </aside>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="card p-4">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function CompanyTable({
  companies,
  selectedCompanyId,
  onSelect,
}: {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="max-h-[720px] overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-[#f4f7f2] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          <tr>
            <th className="p-3">Empresa</th>
            <th className="p-3">Segmento</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr
              key={company.id}
              className={`cursor-pointer border-t border-[var(--border)] hover:bg-[#f4f7f2] ${selectedCompanyId === company.id ? "bg-[#eef5ec]" : ""}`}
              onClick={() => onSelect(company.id)}
            >
              <td className="p-3 font-bold">
                {company.name}
                <p className="mt-1 text-xs font-normal text-[var(--muted)]">{company.legal_name}</p>
              </td>
              <td className="p-3 capitalize">{company.segment}</td>
              <td className="p-3 capitalize">{company.status}</td>
              <td className="p-3">{company.phone || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!companies.length ? <p className="p-6 text-sm text-[var(--muted)]">No hay empresas con esos filtros.</p> : null}
    </div>
  );
}

function ContactsTable({ contacts, onSelectCompany }: { contacts: Contact[]; onSelectCompany: (id: string) => void }) {
  return (
    <div className="max-h-[720px] overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-[#f4f7f2] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          <tr>
            <th className="p-3">Contacto</th>
            <th className="p-3">Empresa</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Email</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id} className="border-t border-[var(--border)] hover:bg-[#f4f7f2]">
              <td className="p-3 font-bold">{contact.full_name || "Sin nombre"}</td>
              <td className="p-3">
                <button className="text-left font-semibold text-[var(--primary)]" onClick={() => contact.company_id && onSelectCompany(contact.company_id)}>
                  {contact.company_name || "—"}
                </button>
              </td>
              <td className="p-3 capitalize">{contact.role || "—"}</td>
              <td className="p-3">{contact.email || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivitiesTable({ activities, companies }: { activities: Activity[]; companies: Company[] }) {
  const companyById = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <div className="max-h-[720px] overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-[#f4f7f2] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          <tr>
            <th className="p-3">Empresa</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Vence</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Notas</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id} className="border-t border-[var(--border)]">
              <td className="p-3 font-bold">{activity.company_id ? companyById.get(activity.company_id) : "—"}</td>
              <td className="p-3 capitalize">{activity.activity_type}</td>
              <td className="p-3">{activity.due_date || "—"}</td>
              <td className="p-3">{activity.completed ? "Completada" : "Pendiente"}</td>
              <td className="p-3">{activity.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!activities.length ? <p className="p-6 text-sm text-[var(--muted)]">No hay actividades todavía.</p> : null}
    </div>
  );
}

function DetailItem({ label, value, isLink = false }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold">
        {value ? (
          isLink ? (
            <a className="text-[var(--primary)]" href={value} target="_blank" rel="noreferrer">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <article className="rounded-xl border border-[var(--border)] p-3 text-sm">
      <p className="font-black">{contact.full_name || "Sin nombre"}</p>
      <p className="mt-1 capitalize text-[var(--muted)]">{contact.role || "Rol pendiente"}</p>
      <p className="mt-2 break-words">{contact.email || "Sin email"}</p>
      <p className="mt-1 text-[var(--muted)]">{contact.phone || "Sin teléfono"}</p>
      {contact.notes ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{contact.notes}</p> : null}
    </article>
  );
}

function ActivityCard({ activity, onToggle }: { activity: Activity; onToggle?: (activity: Activity) => void }) {
  return (
    <article className="rounded-xl border border-[var(--border)] p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="badge">{activity.activity_type}</span>
          <span className="badge">{activity.completed ? "completada" : "pendiente"}</span>
        </div>
        <span className="text-xs text-[var(--muted)]">{activity.due_date ? `Vence: ${activity.due_date}` : "Sin fecha"}</span>
      </div>
      <p className="mt-3 leading-6">{activity.notes}</p>
      {onToggle ? (
        <button className="btn btn-secondary mt-3 w-full" type="button" onClick={() => onToggle(activity)}>
          {activity.completed ? "Reabrir actividad" : "Marcar como completada"}
        </button>
      ) : null}
    </article>
  );
}

function CenteredMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}
