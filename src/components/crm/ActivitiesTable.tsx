import { formatActivityType, isOverdue } from "@/features/crm/dashboardModel";
import type { Activity, Company } from "@/lib/types";
import { EmptyState } from "@/components/crm/EmptyState";

export function ActivitiesTable({ activities, companyById, selectedActivityId, onSelect }: { activities: Activity[]; companyById: Map<string, Company>; selectedActivityId: string | null; onSelect: (activity: Activity) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Seguimiento</th><th>Vence</th><th>Estado</th><th>Notas</th></tr></thead><tbody>{activities.map((activity) => <tr key={activity.id} className={selectedActivityId === activity.id ? "selected" : ""} onClick={() => onSelect(activity)}>
    <td><strong>{activity.company_id ? companyById.get(activity.company_id)?.name || "-" : "-"}</strong><span>{activity.company_id ? companyById.get(activity.company_id)?.segment || "Sin segmento" : "Sin cliente"}</span></td><td>{formatActivityType(activity.activity_type)}</td><td>{activity.due_date || "-"}</td><td>{activity.completed ? "Completada" : isOverdue(activity) ? "Vencida" : "Pendiente"}</td><td>{activity.notes || "-"}</td>
  </tr>)}</tbody></table>{!activities.length ? <EmptyState title="Sin actividades" description="No hay seguimiento con esa búsqueda." /> : null}</div>;
}
