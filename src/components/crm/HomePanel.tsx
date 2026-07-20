import { Building2, CalendarClock, ClipboardCheck, Mail, Tag, Target, UserRound, UsersRound, type LucideIcon } from "lucide-react";

type HomePanelProps = {
  companies: number;
  prospects: number;
  inFollowUp: number;
  contacts: number;
  contactsWithoutEmail: number;
  rolesPending: number;
  overdueActivities: number;
  dataToValidate: number;
  onOpenProspecting: () => void;
  onOpenCompanies: () => void;
  onOpenFollowUp: () => void;
  onOpenContacts: () => void;
  onOpenActivities: () => void;
  onOpenData: () => void;
};

export function HomePanel({
  companies,
  prospects,
  inFollowUp,
  contacts,
  contactsWithoutEmail,
  rolesPending,
  overdueActivities,
  dataToValidate,
  onOpenProspecting,
  onOpenCompanies,
  onOpenFollowUp,
  onOpenContacts,
  onOpenActivities,
  onOpenData,
}: HomePanelProps) {
  return (
    <section className="home-panel">
      <div className="home-copy">
        <p className="panel-kicker">Operación comercial</p>
        <h2>Prioriza clientes y contactos antes de vender más.</h2>
        <p>Esta vista separa prospectos de clientes actuales para cuidar el embudo comercial sin mezclar oportunidades con cuentas convertidas.</p>
      </div>
      <div className="action-grid">
        <ActionCard icon={Target} label="Prospección" value={prospects} helper="Oportunidades fuera de la base de clientes" onClick={onOpenProspecting} />
        <ActionCard icon={Building2} label="Clientes en base" value={companies} helper="Clientes actuales cargados" onClick={onOpenCompanies} />
        <ActionCard icon={UsersRound} label="Contactos comerciales" value={contacts} helper="Personas asociadas a clientes" onClick={onOpenContacts} />
        <ActionCard icon={Tag} label="En seguimiento" value={inFollowUp} helper="Clientes con gestión comercial abierta" onClick={onOpenFollowUp} />
        <ActionCard icon={Mail} label="Contactos sin email" value={contactsWithoutEmail} helper="Falta canal para cotizaciones o seguimiento" onClick={onOpenContacts} />
        <ActionCard icon={UserRound} label="Roles pendientes" value={rolesPending} helper="Identificar compras, cocina/chef o pagos" onClick={onOpenContacts} />
        <ActionCard icon={CalendarClock} label="Actividades vencidas" value={overdueActivities} helper="Seguimientos que necesitan acción" onClick={onOpenActivities} />
        <ActionCard icon={ClipboardCheck} label="Datos por validar" value={dataToValidate} helper="Clientes o contactos con campos incompletos" onClick={onOpenData} />
      </div>
    </section>
  );
}

function ActionCard({ icon: Icon, label, value, helper, onClick }: { icon: LucideIcon; label: string; value: number; helper: string; onClick: () => void }) {
  return <button className="action-card" type="button" onClick={onClick}><span className="metric-icon"><Icon size={18} /></span><span><strong>{value}</strong><span className="action-label">{label}</span><span className="action-helper">{helper}</span></span></button>;
}
