export type CompanyStatus =
  | "nuevo"
  | "por validar"
  | "contactado"
  | "interesado"
  | "cotizado"
  | "cliente"
  | "descartado";

export type ActivityType = "note" | "call" | "email" | "whatsapp" | "follow_up" | "meeting";

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
