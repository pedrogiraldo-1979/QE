import { getResponseChanges, getResponseCustomerName, getResponseDate, getResponseId, getResponseSubtitle, type CustomerUpdateResponse } from "@/features/crm/dashboardModel";
import { EmptyState } from "@/components/crm/EmptyState";

export function CustomerResponsesTable({ responses, loading, error, processingResponseId, onApprove, onReject, onRetry }: {
  responses: CustomerUpdateResponse[]; loading: boolean; error: string | null; processingResponseId: string | null;
  onApprove: (response: CustomerUpdateResponse) => void; onReject: (response: CustomerUpdateResponse) => void; onRetry: () => void;
}) {
  if (loading) return <EmptyState title="Cargando respuestas" description="Consultando formularios pendientes de revisión." />;
  if (error) return <div className="review-error"><strong>No pudimos cargar las respuestas.</strong><span>{error}</span><button className="btn btn-secondary compact" type="button" onClick={onRetry}>Reintentar</button></div>;
  return <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Comparación</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{responses.map((response) => {
    const responseId = getResponseId(response); const changes = getResponseChanges(response); const isProcessing = responseId ? processingResponseId === responseId : false;
    return <tr key={responseId || getResponseCustomerName(response)}><td><strong>{getResponseCustomerName(response)}</strong><span>{getResponseSubtitle(response)}</span></td><td><div className="comparison-stack">{changes.map((change) => <div className="comparison-row" key={`${responseId}-${change.label}`}><strong>{change.label}</strong><span><em>Actual:</em> {change.currentValue || "-"}</span><span><em>Nuevo:</em> {change.newValue || "-"}</span></div>)}</div></td><td>{getResponseDate(response)}</td><td><div className="row-actions"><button className="btn btn-primary compact" type="button" disabled={!responseId || isProcessing} onClick={() => onApprove(response)}>Aprobar</button><button className="btn btn-secondary compact" type="button" disabled={!responseId || isProcessing} onClick={() => onReject(response)}>Rechazar</button></div></td></tr>;
  })}</tbody></table>{!responses.length ? <EmptyState title="Sin respuestas pendientes" description="No hay formularios de clientes por revisar." /> : null}</div>;
}
