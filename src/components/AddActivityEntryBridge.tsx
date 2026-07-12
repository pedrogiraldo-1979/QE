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

export default function AddActivityEntryBridge() {
  const supabase = getSupabaseClient();
  const [activePage, setActivePage] = useState(false);
  const [actionGrid, setActionGrid] = useState<Element | null>(null);
  const [workspace, setWorkspace] = useState<Element | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
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
    void loadCompanies();
  }, [activePage]);

  async function loadCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from("companies").select("id,name,segment").order("name", { ascending: true });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setCompanies((data || []) as CompanyOption[]);
    setLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCompany = companies.find((company) => company.id === companyId);
    const cleanNotes = notes.trim().replace(/\s+/g, " ");

    if (!selectedCompany) {
      setMessage("Selecciona un cliente actual desde los resultados de búsqueda.");
      return;
    }

    if (!cleanNotes) {
      setMessage("Agrega una nota breve para la actividad.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("activities").insert({
      company_id: selectedCompany.id,
      activity_type: activityType,
      notes: cleanNotes,
      due_date: dueDate || null,
      completed: false,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Actividad creada para cliente actual.");
    setCompanyId("");
    setCompanySearch("");
    setActivityType("follow_up");
    setDueDate("");
    setNotes("");
    setSaving(false);
  }

  const selectedCompany = useMemo(() => companies.find((company) => company.id === companyId) || null, [companies, companyId]);

  const suggestedCompanies = useMemo(() => {
    const query = normalizeSearch(companySearch);
    const terms = query.split(" ").filter(Boolean);

    if (!terms.length) return companies.slice(0, 8);

    return companies
      .map((company) => {
        const name = normalizeSearch(company.name || "");
        const segment = normalizeSearch(company.segment || "");
        const searchable = `${name} ${segment}`.trim();
        let score = 0;

        for (const term of terms) {
          if (!searchable.includes(term)) return null;
          if (name === query) score += 16;
          if (name.startsWith(term)) score += 8;
          if (name.includes(` ${term}`)) score += 5;
          if (name.includes(term)) score += 3;
          if (segment.includes(term)) score += 1;
        }

        return { company, score };
      })
      .filter((item): item is { company: CompanyOption; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score || String(a.company.name || "").localeCompare(String(b.company.name || ""), "es"))
      .slice(0, 8)
      .map((item) => item.company);
  }, [companies, companySearch]);

  function selectCompany(company: CompanyOption) {
    setCompanyId(company.id);
    setCompanySearch(company.name || "");
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
            <span className="action-helper">Crear llamada, WhatsApp, email o tarea para cliente actual.</span>
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
                  <h2>Seguimiento para cliente actual</h2>
                </div>
                <button className="btn btn-secondary compact" type="button" onClick={() => setFormOpen(false)}>
                  Cerrar
                </button>
              </div>

              {message ? <div className="alert alert-info">{message}</div> : null}

              <form className="activity-form add-activity-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="field-label" style={{ gridColumn: "1 / -1" }}>
                    Buscar cliente
                    <input
                      className="input smart-client-input"
                      value={companySearch}
                      onChange={(event) => {
                        setCompanySearch(event.target.value);
                        setCompanyId("");
                      }}
                      placeholder="Escribe una palabra del cliente: andino, hilton, club, grand..."
                      disabled={loading || saving}
                      autoComplete="off"
                    />
                  </label>

                  <div className="smart-company-results" style={{ gridColumn: "1 / -1" }}>
                    {suggestedCompanies.map((company) => (
                      <button
                        className={`smart-company-option ${company.id === companyId ? "selected" : ""}`}
                        key={company.id}
                        type="button"
                        onClick={() => selectCompany(company)}
                        disabled={saving}
                      >
                        <strong>{company.name || "Cliente sin nombre"}</strong>
                        <span>{company.segment || "Cliente actual"}</span>
                      </button>
                    ))}
                    {companySearch && !suggestedCompanies.length ? <div className="smart-company-empty">No encontramos coincidencias. Prueba con otra palabra del nombre.</div> : null}
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
                    <strong>{selectedCompany?.name || "Cliente pendiente"}</strong>
                    <span>{selectedCompany ? selectedCompany.segment || "Cliente actual" : "Busca y selecciona una coincidencia"}</span>
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
