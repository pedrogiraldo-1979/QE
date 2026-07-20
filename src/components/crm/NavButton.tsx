import type { LucideIcon } from "lucide-react";

export function NavButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}><Icon size={18} /><span>{label}</span></button>;
}
