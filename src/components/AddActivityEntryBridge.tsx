"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Plus, RotateCcw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

const activityTypeOptions = [
  { value: "follow_up", label: "Seguimiento" },
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
  { value: "note", label: "Nota" },
];

type CompanyOption = {
  id: string;
  name: string | null;
  segment: string | null;
};

type ProspectOption = {
  id: string;
  company_name: string | null;
  segment: string | null;
};

type ActivityTarget = {
  key: string;
  id: string;
  name: string;
  segment: string | null;
  source: "cliente" | "prospecto";
};

export default function AddActivityEntryBridge() {
  const supabase = getSupabaseClient();
  const [activePage, setActivePage] = useState(false);
  const [actionGrid, setActionGrid] = useState<Element | null>(null);
  const [workspace, setWorkspace] = useState<Element | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [targetKey, setTargetKey] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [activityType, setActivityType] = useState("follow_up");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const updateMountTargets = () => {
      const isAddPage = window.location.pathname === "/agregar";
      const grid = document.querySelector(".workspace .action-grid");
      const pageWorkspace = document.querySelector(".workspace");
      setActivePage(isAddPage && Boolean(grid) && Boolean(pageWorkspace));
      setActionGrid(grid);
      setWorkspace(pageWorkspace);
    };

    updateMountTargets();
    const observer = new MutationObserver(updateMountTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", updateMountTargets);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", updateMountTargets);
    };
  }, []);

  useEffect(() => {
    if (!activePage) return;
    void loadTargets();
  }, [activePage]);

  async function loadTargets() {
    setLoading(true);
    const [companiesResult, prospectsResult] = await Promise.all([
      supabase.from("companies").select("id,name,segment").order("name", { ascending: true }),
      supabase.from("prospects").select("id,company_name,segment").order("company_name", { ascending: true }).limit(600),
    ]);

    if (companiesResult.error || prospectsResult.error) {
      setMessage(companiesResult.error?.message || prospectsResult.error?.message || "No pudimos cargar clientes y prospectos.");
      setLoading(false);
      return;
    }

    setCompanies((companiesResult.data || []) as CompanyOption[]);
    setProspects((prospectsResult.data || []) as ProspectOption[]);
    setLoading(false);
  }

  const targets = useMemo<ActivityTarget[]>(() => {
    const customerTargets = companies.map((company) => ({
      key: `cliente:${company.id}`,
      id: company.id,
      name: company.name || "Cliente sin nombre",
      segment: company.segment,
      source: "cliente" as const,
    }));

    const prospectTargets = prospects.map((prospect) => ({
      key: `prospecto:${prospect.id}`,
      id: prospect.id,
      name: prospect.company_name || "Prospecto sin nombre",
      segment: prospect.segment,
      source: "prospecto" as const,
    }));

    return [...customerTargets, ...prospectTargets];
  }, [companies, prospects]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedTarget = targets.find((target) => target.key === targetKey);
    const cleanNotes = notes.trim().replace(/\s+/g, " ");

    if (!selectedTarget) {
      setMessage("Selecciona un cliente o prospecto desde los resultados de búsqueda.");
      return;
    }

    if (!cleanNotes) {
      setMessage("Agrega una nota breve para la actividad.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const table = selectedTarget.source === "prospecto" ? "prospect_activities" : "activities";
    const payload =
      selectedTarget.source === "prospecto"
        ? {
            prospect_id: selectedTarget.id,
            activity_type: activityType,
            notes: cleanNotes,
            due_date: dueDate || null,
            completed: false,
          }
        : {
            company_id: selectedTarget.id,
            activity_type: activityType,
            notes: cleanNotes,
            due_date: dueDate || null,
            completed: false,
          };

    const { error } = await supabase.from(table).insert(payload);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(selectedTarget.source === "prospecto" ? "Actividad creada para prospecto." : "Actividad creada para cliente actual.");
    setTargetKey("");
    setTargetSearch("");
    setActivityType("follow_up");
    setDueDate("");
    setNotes("");
    setSaving(false);
  }

  const selectedTarget = useMemo(() => targets.find((target) => target.key === targetKey) || null, [targets, targetKey]);

  const suggestedTargets = useMemo(() => {
    const query = normalizeSearch(targetSearch);
    const terms = query.split(" ").filter(Boolean);

    if (!terms.length) return targets.slice(0, 8);

    return targets
      .map((target) => {
        const name = normalizeSearch(target.name || "");
        const segment = normalizeSearch(target.segment || "");
        const source = normalizeSearch(target.source);
        const searchable = `${name} ${segment} ${source}`.trim();
        let score = target.source === "cliente" ? 1 : 0;

        for (const term of terms) {
          if (!searchable.includes(term)) return null;
          if (name === query) score += 16;
          if (name.startsWith(term)) score += 8;
          if (name.includes(` ${term}`)) score += 5;
          if (name.includes(term)) score += 3;
          if (segment.includes(term)) score += 1;
          if (source.includes(term)) score += 1;
        }

        return { target, score };
      })
      .filter((item): item is { target: ActivityTarget; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score || a.target.name.localeCompare(b.target.name, "es"))
      .slice(0, 8)
      .map((item) => item.target);
  }, [targets, targetSearch]);

  function selectTarget(target: ActivityTarget) {
    setTargetKey(target.key);
    setTargetSearch(target.name || "");
    setMessage(null);
  }

  if (!activePage || !actionGrid || !workspace) return null;

  return (
    <>
      {createPortal(
        <button className="action-card add-activity-card" type="button" onClick={() => setFormOpen(true)}>
          <span className="metric-icon">
            <CalendarClock size={19} />
          </span>
          <span>
            <strong>+</strong>
            <span className="action-label">Actividad / seguimiento</span>
            <span className="action-helper">Crear llamada, WhatsApp, email o tarea para cliente o prospecto.</span>
          </span>
        </button>,
        actionGrid
      )}

      {formOpen
        ? createPortal(
            <section className="add-activity-panel">
              <div className="panel-toolbar">
                <div>
                  <p className="panel-kicker">Nueva actividad</p>
                  <h2>Seguimiento para cliente o prospecto</h2>
                </div>
                <button className="btn btn-secondary compact" type="button" onClick={() => setFormOpen(false)}>
                  Cerrar
                </button>
              </div>

              {message ? <div className="alert alert-info">{message}</div> : null}

              <form className="activity-form add-activity-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Buscar cliente o prospecto
                    <input
                      className="input smart-client-input"
                      value={targetSearch}
                      onChange={(event) => {
                        setTargetSearch(event.target.value);
                        setTargetKey("");
                      }}
                      placeholder="Escribe una palabra: andino, hilton, club, grand, colegio..."
                      disabled={loading || saving}
                      autoComplete="off"
                    />
                  </label>

                  <div className="smart-company-results" style={{ gridColumn: "1 / -1" }}>
                    {suggestedTargets.map((target) => (
                      <button
                        className={`smart-company-option ${target.key === targetKey ? "selected" : ""}`}
                        key={target.key}
                        type="button"
                        onClick={() => selectTarget(target)}
                        disabled={saving}
                      >
                        <strong>{target.name}</strong>
                        <span>{target.source === "prospecto" ? "Prospecto" : "Cliente actual"} · {target.segment || "Sin segmento"}</span>
                      </button>
                    ))}
                    {targetSearch && !suggestedTargets.length ? <div className="smart-company-empty">No encontramos coincidencias. Prueba con otra palabra del nombre.</div> : null}
                  </div>

                  <label className="field-label">
                    Tipo
                    <select className="input" value={activityType} onChange={(event) => setActivityType(event.target.value)} disabled={saving}>
                      {activityTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="field-label">
                    Fecha objetivo
                    <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={saving} />
                  </label>

                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Nota / acción requerida
                    <textarea
                      className="textarea"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ej. llamar para confirmar contacto de compras, enviar lista de precios, hacer seguimiento a cotización..."
                      disabled={saving}
                      required
                    />
                  </label>
                </div>

                <aside className="add-activity-preview">
                  <CalendarClock size={18} />
                  <div>
                    <strong>{selectedTarget?.name || "Cliente/prospecto pendiente"}</strong>
                    <span>{selectedTarget ? `${selectedTarget.source === "prospecto" ? "Prospecto" : "Cliente actual"} · ${selectedTarget.segment || "Sin segmento"}` : "Busca y selecciona una coincidencia"}</span>
                  </div>
                  <span>{dueDate || "Sin fecha"}</span>
                </aside>

                <div className="panel-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={saving || loading}>
                    {saving ? <RotateCcw size={16} className="spin" /> : <Plus size={17} />}
                    {saving ? "Guardando" : "Crear actividad"}
                  </button>
                </div>
              </form>
            </section>,
            workspace
          )
        : null}
    </>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}
