"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Plus, RotateCcw } from "lucide-react";
import type { CrmSupabaseClient } from "@/lib/supabase";
import { REFERENCE_ENTITY_LIMIT } from "@/lib/data/queryLimits";
import {
  buildActivityInsert,
  buildActivityTargets,
  filterActivityTargets,
  validateActivityEntry,
  type ActivityEntryCompany,
  type ActivityEntryProspect,
  type ActivityEntryTarget,
} from "@/features/crm/activityEntryModel";

const activityTypeOptions = [
  { value: "follow_up", label: "Seguimiento" },
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
  { value: "note", label: "Nota" },
];

type AddActivityEntryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  supabase: CrmSupabaseClient;
};

export default function AddActivityEntryForm({ isOpen, onClose, supabase }: AddActivityEntryFormProps) {
  const [targets, setTargets] = useState<ActivityEntryTarget[]>([]);
  const [targetKey, setTargetKey] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [activityType, setActivityType] = useState("follow_up");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const savingRef = useRef(false);
  const activityTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const animationFrame = window.requestAnimationFrame(() => activityTitleRef.current?.focus());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  useEffect(() => {
    let active = true;

    async function loadTargets() {
      setLoading(true);

      try {
        const [companiesResult, prospectsResult] = await Promise.all([
          supabase.from("companies").select("id,name,segment").order("name", { ascending: true }),
          supabase
            .from("prospects")
            .select("id,company_name,segment")
            .order("company_name", { ascending: true })
            .limit(REFERENCE_ENTITY_LIMIT),
        ]);

        if (!active) return;
        if (companiesResult.error || prospectsResult.error) {
          setMessage(companiesResult.error?.message || prospectsResult.error?.message || "No pudimos cargar clientes y prospectos.");
          return;
        }

        setTargets(
          buildActivityTargets(
            (companiesResult.data || []) as ActivityEntryCompany[],
            (prospectsResult.data || []) as ActivityEntryProspect[],
          ),
        );
      } catch {
        if (active) setMessage("No pudimos cargar clientes y prospectos. Intenta de nuevo.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTargets();
    return () => {
      active = false;
    };
  }, [supabase]);

  const selectedTarget = useMemo(() => targets.find((target) => target.key === targetKey) || null, [targets, targetKey]);
  const suggestedTargets = useMemo(() => filterActivityTargets(targets, targetSearch), [targets, targetSearch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const validationMessage = validateActivityEntry(selectedTarget, notes);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    if (!selectedTarget) return;
    savingRef.current = true;
    setSaving(true);
    setMessage(null);

    const operation = buildActivityInsert(selectedTarget, { activityType, dueDate, notes });

    try {
      const { error } = operation.table === "prospect_activities"
        ? await supabase.from("prospect_activities").insert(operation.payload)
        : await supabase.from("activities").insert(operation.payload);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(selectedTarget.source === "prospecto" ? "Actividad creada para prospecto." : "Actividad creada para cliente actual.");
      setTargetKey("");
      setTargetSearch("");
      setActivityType("follow_up");
      setDueDate("");
      setNotes("");
    } catch {
      setMessage("No se pudo crear la actividad. Intenta de nuevo.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function selectTarget(target: ActivityEntryTarget) {
    setTargetKey(target.key);
    setTargetSearch(target.name);
    setMessage(null);
  }

  if (!isOpen) return null;

  return (
    <section className="add-activity-panel" aria-labelledby="add-activity-title">
      <div className="panel-toolbar">
        <div>
          <p className="panel-kicker">Nueva actividad</p>
          <h2 id="add-activity-title" ref={activityTitleRef} tabIndex={-1}>Seguimiento para cliente o prospecto</h2>
        </div>
        <button className="btn btn-secondary compact" type="button" onClick={onClose} disabled={saving}>
          Cerrar
        </button>
      </div>

      {message ? <div className="alert alert-info" role="status" aria-live="polite">{message}</div> : null}

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

          <div className="smart-company-results" style={{ gridColumn: "1 / -1" }} role="group" aria-label="Resultados de clientes y prospectos">
            {suggestedTargets.map((target) => (
              <button
                className={`smart-company-option ${target.key === targetKey ? "selected" : ""}`}
                key={target.key}
                type="button"
                onClick={() => selectTarget(target)}
                disabled={saving || loading}
                aria-pressed={target.key === targetKey}
              >
                <strong>{target.name}</strong>
                <span>{target.source === "prospecto" ? "Prospecto" : "Cliente actual"} · {target.segment || "Sin segmento"}</span>
              </button>
            ))}
            {loading ? <div className="smart-company-empty">Cargando clientes y prospectos…</div> : null}
            {targetSearch && !suggestedTargets.length && !loading ? (
              <div className="smart-company-empty">No encontramos coincidencias. Prueba con otra palabra del nombre.</div>
            ) : null}
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

        <aside className="add-activity-preview" aria-label="Resumen de la actividad">
          <CalendarClock size={18} aria-hidden="true" />
          <div>
            <strong>{selectedTarget?.name || "Cliente/prospecto pendiente"}</strong>
            <span>{selectedTarget ? `${selectedTarget.source === "prospecto" ? "Prospecto" : "Cliente actual"} · ${selectedTarget.segment || "Sin segmento"}` : "Busca y selecciona una coincidencia"}</span>
          </div>
          <span>{dueDate || "Sin fecha"}</span>
        </aside>

        <div className="panel-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving || loading}>
            {saving ? <RotateCcw size={16} className="spin" aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            {saving ? "Guardando" : "Crear actividad"}
          </button>
        </div>
      </form>
    </section>
  );
}

