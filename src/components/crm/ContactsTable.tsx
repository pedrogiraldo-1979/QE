import { formatContactRole, getContactIssues } from "@/features/crm/dashboardModel";
import type { Contact } from "@/lib/types";
import { EmptyState } from "@/components/crm/EmptyState";

export function ContactsTable({ contacts, onSelectCompany, onCompleteData }: { contacts: Contact[]; onSelectCompany: (id: string) => void; onCompleteData: (companyId: string | null) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Contacto comercial</th><th>Cliente</th><th>Rol operativo</th><th>Datos</th><th>Acción</th></tr></thead><tbody>{contacts.map((contact) => {
    const issues = getContactIssues(contact);
    return <tr key={contact.id}><td><strong>{contact.full_name || "Sin nombre"}</strong><span>{contact.phone || "Teléfono pendiente"}</span></td><td><button className="table-link" onClick={() => contact.company_id && onSelectCompany(contact.company_id)} type="button">{contact.company_name || "-"}</button></td><td>{formatContactRole(contact.role)}</td>
      <td><div className="issue-row">{issues.length ? issues.map((issue) => <span className="issue-badge" key={issue}>{issue}</span>) : <span className="ok-badge">Datos útiles</span>}</div></td><td><button className="btn btn-secondary compact" type="button" onClick={() => onCompleteData(contact.company_id)}>{issues.length ? "Completar datos" : "Editar contacto"}</button></td></tr>;
  })}</tbody></table>{!contacts.length ? <EmptyState title="Sin contactos" description="No hay contactos comerciales con esa búsqueda." /> : null}</div>;
}
