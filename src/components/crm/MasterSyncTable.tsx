import { EmptyState } from "@/components/crm/EmptyState";
import type { MasterSyncContact, MasterSyncItem } from "@/features/crm/dashboardModel";

export function MasterSyncTable({
  items,
  loading,
  error,
  processingId,
  onComplete,
  onRetry,
}: {
  items: MasterSyncItem[];
  loading: boolean;
  error: string | null;
  processingId: string | null;
  onComplete: (responseId: string) => void;
  onRetry: () => void;
}) {
  if (loading) return <EmptyState title="Cargando reconciliación" description="Consultando actualizaciones pendientes de los archivos maestros." />;
  if (error) return <div className="review-error"><strong>No pudimos cargar la cola de maestros.</strong><span>{error}</span><button className="btn btn-secondary compact" type="button" onClick={onRetry}>Reintentar</button></div>;
  if (!items.length) return <EmptyState title="Maestros al día" description="No hay respuestas aprobadas pendientes de actualizar en Hoja1 y contactos_base." />;

  return <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Datos aprobados</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{items.map((item) => {
    const contacts = [item.primary_contact, ...(item.secondary_contacts || [])].filter(Boolean) as MasterSyncContact[];
    const isProcessing = processingId === item.response_id;
    return <tr key={item.response_id}>
      <td><strong>{item.cliente || "Cliente sin nombre"}</strong><span>{item.nit || item.company_id}</span></td>
      <td><div className="comparison-stack"><div className="comparison-row"><strong>{item.razon_social || item.cliente || "Empresa"}</strong><span>{item.direccion || "Sin dirección"}</span></div>{contacts.map((contact, index) => <div className="comparison-row" key={contact.id || contact.email || `${item.response_id}-${index}`}><strong>{contact.full_name || `Contacto ${index + 1}`}</strong><span>{[contact.role, contact.contact_type, contact.email].filter(Boolean).join(" · ") || "Sin detalles"}</span></div>)}</div></td>
      <td><span className="status-badge tone-amber">Pendiente maestros</span><span>Actualizar Hoja1 y contactos_base</span></td>
      <td><button className="btn btn-primary compact" type="button" disabled={isProcessing} onClick={() => onComplete(item.response_id)}>{isProcessing ? "Confirmando..." : "Confirmar sincronización"}</button></td>
    </tr>;
  })}</tbody></table></div>;
}
