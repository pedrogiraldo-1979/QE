"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileQuestion, LogOut, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useCrmSession } from "@/hooks/useCrmSession";
import type { Prospect, ProspectContact, ProspectList } from "@/lib/types";
import { getProspectDisplayName } from "@/lib/prospectOperations";

export default function ProspectCleanupPage() {
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
  const [listFilter, setListFilter] = useState("todos");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) void loadData();
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [listsResult, prospectsResult, contactsResult] = await Promise.all([
      supabase.from("prospect_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("prospect_contacts").select("*"),
    ]);

    if (listsResult.error || prospectsResult.error || contactsResult.error) {
      setMessage(listsResult.error?.message || prospectsResult.error?.message || contactsResult.error?.message || "No pudimos cargar prospectos.");
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
    setProspects([]);
    setContacts([]);
    setLists([]);
  }

  async function deleteProspect(prospect: Prospect) {
    const name = getProspectDisplayName(prospect);
    const contactCount = getContactCount(prospect.id);
    const confirmed = window.confirm(
      `¿Eliminar el prospecto "${name}"?\n\nEsto borrará el prospecto y ${contactCount} contacto(s) prospecto asociados. No borra clientes CRM ni contactos CRM reales.`
    );

    if (!confirmed) return;

    setDeletingId(prospect.id);
    setMessage(null);

    const { error: prospectError } = await supabase.rpc("delete_prospect", { p_prospect_id: prospect.id });

    if (prospectError) {
      setMessage(prospectError.message);
      setDeletingId(null);
      return;
    }

    setContacts((current) => current.filter((contact) => contact.prospect_id !== prospect.id));
    setProspects((current) => current.filter((item) => item.id !== prospect.id));
    setDeletingId(null);
    setMessage(`Prospecto eliminado: ${name}.`);
  }

  const listById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const list = prospect.list_id ? listById.get(prospect.list_id) : null;
      const matchesList = listFilter === "todos" || prospect.list_id === listFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          getProspectDisplayName(prospect),
          prospect.legal_name,
          prospect.nit,
          prospect.phone,
          prospect.city,
          prospect.segment,
          list?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      return matchesList && matchesSearch;
    });
  }, [listById, listFilter, normalizedSearch, prospects]);

  function getContactCount(prospectId: string) {
    return contacts.filter((contact) => contact.prospect_id === prospectId).length;
  }

  if (!sessionReady) {
    return <CenteredMessage title="Cargando limpieza" description="Validando sesión..." />;
  }

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">QE</span>
            <div>
              <p className="eyebrow">Quindío Exquisito</p>
              <h1>Limpieza de prospectos</h1>
            </div>
          </div>
          <p className="login-copy">Ingresa para eliminar prospectos de prueba de forma manual y controlada.</p>
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
          <Link className="nav-button" href="/prospectos">
            <ArrowLeft size={18} />
            <span>Volver a prospección</span>
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
            <h1>Limpieza manual de prospectos</h1>
          </div>
          <div className="topbar-actions">
            <Link className="btn btn-secondary" href="/prospectos">Volver a listas</Link>
            <button className="btn btn-secondary" type="button" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
              {loading ? "Actualizando" : "Refrescar"}
            </button>
          </div>
        </header>

        {message ? <section className="alert alert-info">{message}</section> : null}

        <section className="list-panel">
          <div className="panel-toolbar">
            <div>
              <p className="panel-kicker">Solo uso manual</p>
              <h2>Eliminar prospectos de prueba</h2>
            </div>
            <span className="result-count">{filteredProspects.length}</span>
          </div>

          <div className="filters-row">
            <label className="search-box">
              <Search size={17} />
              <input placeholder="Buscar por nombre, NIT, teléfono o lista" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="select-shell">
              <select value={listFilter} onChange={(event) => setListFilter(event.target.value)}>
                <option value="todos">Todas las listas</option>
                {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prospecto</th>
                  <th>Lista</th>
                  <th>Estado</th>
                  <th>Contactos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect) => {
                  const list = prospect.list_id ? listById.get(prospect.list_id) : null;
                  return (
                    <tr key={prospect.id}>
                      <td>
                        <strong>{getProspectDisplayName(prospect)}</strong>
                        <span>{prospect.nit || prospect.city || "Datos parciales"}</span>
                      </td>
                      <td>{list?.name || "Sin lista"}</td>
                      <td>{prospect.status || "Sin estado"}</td>
                      <td>{getContactCount(prospect.id)}</td>
                      <td>
                        <button className="btn btn-secondary compact" type="button" disabled={deletingId === prospect.id} onClick={() => void deleteProspect(prospect)}>
                          <Trash2 size={14} />
                          {deletingId === prospect.id ? "Eliminando" : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredProspects.length ? <EmptyState title="Sin prospectos" description="No hay prospectos con esos filtros." /> : null}
          </div>
        </section>
      </section>
    </main>
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
