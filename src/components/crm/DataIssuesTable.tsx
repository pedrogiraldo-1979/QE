import type { DataIssueGroup } from "@/features/crm/dashboardModel";
import { EmptyState } from "@/components/crm/EmptyState";

export function DataIssuesTable({ issues, onSelectCompany }: { issues: DataIssueGroup[]; onSelectCompany: (id: string) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Registro</th><th>Tipo</th><th>Campos pendientes</th><th>Acción</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}>
    <td><strong>{issue.title}</strong><span>{issue.subtitle}</span></td><td>{issue.type === "company" ? "Cliente" : "Contacto comercial"}</td><td><div className="issue-row">{issue.issues.map((item) => <span className="issue-badge" key={item}>{item}</span>)}</div></td><td>{issue.companyId ? <button className="btn btn-secondary compact" type="button" onClick={() => onSelectCompany(issue.companyId!)}>Ver ficha</button> : "Relación pendiente"}</td>
  </tr>)}</tbody></table>{!issues.length ? <EmptyState title="Datos al día" description="No hay pendientes visibles con esa búsqueda." /> : null}</div>;
}
