import type { LucideIcon } from "lucide-react";

export function MetricCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: number; helper: string }) {
  return <article className="metric-card"><div className="metric-icon"><Icon size={18} /></div><div><p>{label}</p><strong>{value}</strong><span>{helper}</span></div></article>;
}
