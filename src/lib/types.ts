export type CompanyStatus =
  | "nuevo"
  | "por validar"
  | "contactado"
  | "interesado"
  | "cotizado"
  | "cliente"
  | "descartado";

export type ActivityType = "note" | "call" | "email" | "whatsapp" | "follow_up" | "meeting";

export type ProspectStatus =
  | "nuevo"
  | "por_revisar"
  | "ok_prospecto"
  | "cliente_actual_excluir"
  | "sin_contacto"
  | "contacto_pendiente"
  | "convertido_cliente"
  | "descartado"
  | "por_validar"
  | "contactado"
  | "calificado"
  | "cotizado"
  | "convertido";

export type ProspectPriority = "A" | "B" | "C" | "alta" | "media" | "baja" | string;

export interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  nit: string | null;
  segment: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  status: CompanyStatus | string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Contact {
  id: string;
  company_id: string | null;
  company_name: string | null;
  full_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Activity {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  activity_type: ActivityType | string;
  notes: string | null;
  activity_date: string | null;
  due_date: string | null;
  completed: boolean | null;
  created_at: string | null;
}

export interface ProspectList {
  id: string;
  name: string;
  segment: string | null;
  source: string | null;
  city: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Prospect {
  id: string;
  list_id: string | null;
  company_name: string;
  legal_name: string | null;
  nit: string | null;
  segment: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  status: ProspectStatus | string | null;
  priority: ProspectPriority | string | null;
  source: string | null;
  confidence_score: number | null;
  notes: string | null;
  converted_company_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Legacy compatibility for the original single-page CRM prospecting view.
  name: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export interface ProspectContact {
  id: string;
  prospect_id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProspectActivity {
  id: string;
  prospect_id: string | null;
  contact_id: string | null;
  activity_type: ActivityType | string;
  notes: string | null;
  activity_date: string | null;
  due_date: string | null;
  completed: boolean | null;
  created_at: string | null;
}

export const COMPANY_STATUSES: CompanyStatus[] = [
  "nuevo",
  "por validar",
  "contactado",
  "interesado",
  "cotizado",
  "cliente",
  "descartado",
];

export const ACTIVITY_TYPES: ActivityType[] = [
  "note",
  "call",
  "email",
  "whatsapp",
  "follow_up",
  "meeting",
];

export const PROSPECT_STATUSES: ProspectStatus[] = [
  "nuevo",
  "por_revisar",
  "ok_prospecto",
  "cliente_actual_excluir",
  "sin_contacto",
  "contacto_pendiente",
  "convertido_cliente",
  "descartado",
];

export const PROSPECT_PRIORITIES = ["A", "B", "C", "alta", "media", "baja"] as const;
