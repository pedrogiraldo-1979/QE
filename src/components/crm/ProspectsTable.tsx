import { Plus } from "lucide-react";
import { formatActivityType, getNextActivity, prospectStatusLabels, prospectStatusTone } from "@/features/crm/dashboardModel";
import { getProspectDisplayName, normalizeProspectStatus } from "@/lib/prospectOperations";
import type { Prospect, ProspectActivity } from "@/lib/types";
import { EmptyState } from "@/components/crm/EmptyState";

export function ProspectsTable({ prospects, selectedProspectId, activitiesByProspectId, convertingProspectId, onSelect, onCreateActivity, onConvert }: {
  prospects: Prospect[]; selectedProspectId: string | null; activitiesByProspectId: Map<string, ProspectActivity[]>; convertingProspectId: string | null;
  onSelect: (id: string) => void; onCreateActivity: (id: string) => void; onConvert: (prospect: Prospect) => void;
}) {
  return <div className="table-wrap"><table><thead><tr><th>Prospecto</th><th>Segmento</th><th>Estado</th><th>Contacto</th><th>Próxima acción</th><th>Acción</th></tr></thead><tbody>{prospects.map((prospect) => {
    const nextActivity = getNextActivity(activitiesByProspectId.get(prospect.id) || []);
    const status = normalizeProspectStatus(prospect.status);
    const isConverted = status === "convertido_cliente";
    const isConverting = convertingProspectId === prospect.id;
    return <tr key={prospect.id} className={selectedProspectId === prospect.id ? "selected" : ""} onClick={() => onSelect(prospect.id)}>
      <td><strong>{getProspectDisplayName(prospect)}</strong><span>{prospect.source || prospect.city || "Origen pendiente"}</span></td><td>{prospect.segment || "Sin segmento"}</td>
      <td><span className={`badge ${prospectStatusTone[status]}`}>{prospectStatusLabels[status]}</span></td><td><strong>{prospect.contact_name || "Contacto pendiente"}</strong><span>{prospect.contact_email || prospect.contact_phone || "-"}</span></td>
      <td>{nextActivity?.due_date ? `${formatActivityType(nextActivity.activity_type)} · ${nextActivity.due_date}` : "Sin seguimiento"}</td><td><div className="row-actions">
        <button className="btn btn-secondary compact" type="button" onClick={(event) => { event.stopPropagation(); onCreateActivity(prospect.id); }}><Plus size={14} /> Crear actividad</button>
        <button className="btn btn-primary compact" type="button" disabled={isConverted || isConverting} onClick={(event) => { event.stopPropagation(); onConvert(prospect); }}>{isConverting ? "Convirtiendo" : isConverted ? "Convertido" : "Convertir a cliente"}</button>
      </div></td></tr>;
  })}</tbody></table>{!prospects.length ? <EmptyState title="Sin prospectos" description="No hay prospectos con esos filtros." /> : null}</div>;
}
