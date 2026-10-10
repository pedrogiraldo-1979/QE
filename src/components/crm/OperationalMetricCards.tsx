import { CalendarClock, UsersRound, type LucideIcon } from "lucide-react";
import type { OperationalMetricsState } from "@/features/crm/operationalMetricsLoader";

export function OperationalMetricCards({ state }: { state: OperationalMetricsState }) {
  const loading = state.status !== "ready";
  const coverage = state.status === "ready" ? state.metrics.coverage : null;
  const overdue = state.status === "ready" ? state.metrics.overdue : null;
  const unavailableHelp = "No se pudo verificar una lectura completa. Refresca para intentar de nuevo.";
  const coverageValue = !coverage ? "Cargando" : coverage.status === "unavailable" ? "No disponible"
    : coverage.percentage === null ? "Sin base"
      : new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 }).format(coverage.percentage / 100);
  const coverageHelp = coverage?.status === "available"
    ? `${coverage.numerator} de ${coverage.denominator} empresas con contacto utilizable.`
    : coverage ? unavailableHelp : "Comprobando empresas y contactos.";
  const overdueValue = !overdue ? "Cargando" : overdue.status === "unavailable" ? "No disponible" : String(overdue.count);
  const overdueHelp = overdue?.status === "available"
    ? "Acciones abiertas de clientes y prospectos; corte del día en Colombia."
    : overdue ? unavailableHelp : "Comprobando actividades de clientes y prospectos.";

  return <>
    <SnapshotCard icon={UsersRound} label="Empresas con contacto utilizable" value={coverageValue} helper={coverageHelp} loading={loading} />
    <SnapshotCard icon={CalendarClock} label="Seguimientos vencidos" value={overdueValue} helper={overdueHelp} loading={loading} />
  </>;
}

function SnapshotCard({ icon: Icon, label, value, helper, loading }: {
  icon: LucideIcon; label: string; value: string; helper: string; loading: boolean;
}) {
  return <article className="metric-card" aria-label={label} aria-busy={loading} aria-live="polite">
    <div className="metric-icon"><Icon size={18} aria-hidden="true" /></div>
    <div><p>{label}</p><strong>{value}</strong><span>{helper}</span>
      <span>Lectura al refrescar; no es una instantánea transaccional.</span></div>
  </article>;
}
