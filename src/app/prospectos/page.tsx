"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  Building2,
  ClipboardCheck,
  FileQuestion,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";
import type { Prospect, ProspectContact, ProspectList } from "@/lib/types";
import { normalizeProspectStatus } from "@/lib/prospectOperations";

interface ProspectListStats {
  totalProspects: number;
  totalWithContact: number;
  totalWithValidEmail: number;
}

const statusLabels: Record<string, string> = {
  activa: "Activa",
  pausada: "Pausada",
  cerrada: "Cerrada",
};

export default function ProspectListsPage() {
  const { supabase, sessionReady, isAuthenticated, signIn, signOut } = useCrmSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [contacts, setContacts] = useState<ProspectContact[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAuthenticated) void loadData();
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [listsResult, prospectsResult, contactsResult] = await Promise.all([
      supabase.from("prospect_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("prospect_contacts").select("*").order("created_at", { ascending: false }),
    ]);

    if (listsResult.error || prospectsResult.error || contactsResult.error) {
      setMessage(listsResult.error?.message || prospectsResult.error?.message || contactsResult.error?.message || "No pudimos cargar prospección.");
      setLoading(false);
      return;
    }

    setLists((listsResult.data || []) as ProspectList[]);
    setProspects((prospectsResult.data || []) as Prospect[]);
    setContacts((contactsResult.data || []) as ProspectContact[]);
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
    setLists([]);
    setProspects([]);
    setContacts([]);
  }

  const statsByListId = useMemo(() => {
    const contactsByProspectId = new Map<string, ProspectContact[]>();
    contacts.forEach((contact) => {
      contactsByProspectId.set(contact.prospect_id, [...(contactsByProspectId.get(contact.prospect_id) || []), contact]);
    });

    const map = new Map<string, ProspectListStats>();
    prospects.forEach((prospect) => {
      if (!prospect.list_id) return;
      const current = map.get(prospect.list_id) || { totalProspects: 0, totalWithContact: 0, totalWithValidEmail: 0 };
      const prospectContacts = contactsByProspectId.get(prospect.id) || [];

      map.set(prospect.list_id, {
        totalProspects: current.totalProspects + 1,
        totalWithContact: current.totalWithContact + (prospectContacts.length ? 1 : 0),
        totalWithValidEmail: current.totalWithValidEmail + (prospectContacts.some((contact) => isValidEmail(contact.email)) ? 1 : 0),
      });
    });

    return map;
  }, [contacts, prospects]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLists = useMemo(() => {
    if (!normalizedSearch) return lists;
    return lists.filter((list) =>
      [list.name, list.segment, list.city, list.source, list.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [lists, normalizedSearch]);

  const totalWithValidEmail = Array.from(statsByListId.values()).reduce((sum, item) => sum + item.totalWithValidEmail, 0);
  const totalWithContact = Array.from(statsByListId.values()).reduce((sum, item) => sum + item.totalWithContact, 0);
  const activeProspects = prospects.filter((prospect) => !["cliente_actual_excluir", "descartado", "convertido_cliente", "convertido"].includes(normalizeProspectStatus(prospect.status))).length;

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
          <p className="login-copy">Ingresa para revisar listas, prospectos y contactos antes de cualquier campaña o envío.</p>
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
            <h1>Listas de prospección</h1>
          </div>
          <div className="topbar-actions">
            <Link className="btn btn-primary" href="/prospectos/nuevo">
              <Plus size={17} />
              Nuevo prospecto
            </Link>
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Indicadores de prospección">
          <MetricCard icon={Target} label="Listas" value={lists.length} helper="fuentes de prospección" />
          <MetricCard icon={Building2} label="Prospectos" value={prospects.length} helper="empresas cargadas" />
          <MetricCard icon={LayoutDashboard} label="Activos" value={activeProspects} helper="sin excluir o convertir" />
          <MetricCard icon={UsersRound} label="Con contacto" value={totalWithContact} helper="al menos una persona" />
          <MetricCard icon={Mail} label="Con email válido" value={totalWithValidEmail} helper="aptos para revisar después" />
        </section>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="crm-grid crm-grid-wide">
          <section className="list-panel">
            <div className="panel-toolbar">
              <div>
                <p className="panel-kicker">Listas</p>
                <h2>Revisión antes de campañas</h2>
              </div>
              <span className="result-count">{filteredLists.length}</span>
            </div>
            <div className="filters-row filters-row-simple">
              <label className="search-box">
                <Search size={17} />
                <input placeholder="Buscar por lista, segmento, ciudad o fuente" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
            <div className="table-wrap prospect-lists-table-wrap">
              <table className="prospect-lists-table">
                <thead>
                  <tr>
                    <th>Lista</th>
                    <th>Acción</th>
                    <th>Segmento</th>
                    <th>Ciudad</th>
                    <th>Estado</th>
                    <th>Prospectos</th>
                    <th>Contacto / email</th>
                    <th>Creación</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLists.map((list) => {
                    const stats = statsByListId.get(list.id) || { totalProspects: 0, totalWithContact: 0, totalWithValidEmail: 0 };
                    return (
                      <tr key={list.id}>
                        <td>
                          <strong>{list.name}</strong>
                          <span>{list.notes || "Lista de prospección"}</span>
                        </td>
                        <td>
                          <div className="row-actions row-actions-compact-stack">
                            <Link className="btn btn-primary compact" href={`/prospectos/${list.id}`}>
                              Revisar lista
                            </Link>
                            <Link className="btn btn-secondary compact" href={`/prospectos/nuevo?listId=${list.id}`}>
                              + Prospecto
                            </Link>
                          </div>
                        </td>
                        <td>{list.segment || "Sin segmento"}</td>
                        <td>{list.city || "-"}</td>
                        <td><span className="badge tone-blue">{statusLabels[list.status || ""] || list.status || "Activa"}</span></td>
                        <td>{stats.totalProspects}</td>
                        <td>
                          <strong>{stats.totalWithContact} con contacto</strong>
                          <span>{stats.totalWithValidEmail} con email válido</span>
                        </td>
                        <td>{formatDate(list.created_at)}</td>
                        <td>{list.source || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredLists.length ? <EmptyState title="Sin listas" description="No hay listas de prospección con esos filtros." /> : null}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: typeof Target; label: string; value: number; helper: string }) {
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

function isValidEmail(email?: string | null) {
  if (!email?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 10);
}
