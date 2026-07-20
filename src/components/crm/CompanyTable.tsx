import { Plus } from "lucide-react";
import { formatActivityType, getCompanyIssues, getNextActivity } from "@/features/crm/dashboardModel";
import type { Activity, Company } from "@/lib/types";
import { EmptyState } from "@/components/crm/EmptyState";

export function CompanyTable({ companies, selectedCompanyId, activitiesByCompanyId, onSelect, onCreateActivity, onChangeStatus }: {
  companies: Company[]; selectedCompanyId: string | null; activitiesByCompanyId: Map<string, Activity[]>;
  onSelect: (id: string) => void; onCreateActivity: (id: string) => void; onChangeStatus: (id: string) => void;
}) {
  return <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Segmento</th><th>Ciudad</th><th>Teléfono</th><th>Estado de datos</th><th>Próxima acción</th><th>Acción</th></tr></thead><tbody>{companies.map((company) => {
    const nextActivity = getNextActivity(activitiesByCompanyId.get(company.id) || []);
    const issues = getCompanyIssues(company);
    return <tr key={company.id} className={selectedCompanyId === company.id ? "selected" : ""} onClick={() => onSelect(company.id)}><td><strong>{company.name}</strong><span>{company.legal_name || company.nit || "Datos legales pendientes"}</span></td><td>{company.segment || "Sin segmento"}</td><td>{company.city || "-"}</td><td>{company.phone || "-"}</td>
      <td>{issues.length ? <span className="issue-badge">{issues.length} dato(s)</span> : <span className="ok-badge">Datos suficientes</span>}</td><td>{nextActivity?.due_date ? `${formatActivityType(nextActivity.activity_type)} · ${nextActivity.due_date}` : "Sin seguimiento"}</td><td><div className="row-actions">
        <button className="btn btn-secondary compact" type="button" onClick={(event) => { event.stopPropagation(); onCreateActivity(company.id); }}><Plus size={14} /> Crear actividad</button><button className="btn btn-secondary compact" type="button" onClick={(event) => { event.stopPropagation(); onChangeStatus(company.id); }}>Cambiar estado</button>
      </div></td></tr>;
  })}</tbody></table>{!companies.length ? <EmptyState title="Sin clientes" description="No hay clientes con esos filtros." /> : null}</div>;
}
