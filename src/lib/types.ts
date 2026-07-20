import type { Tables } from "@/lib/database.types";

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
  | "descartado";

export type ProspectPriority = string;

export type Company = Tables<"companies">;

export type Contact = Tables<"contacts">;

export type Activity = Tables<"activities">;

export type ProspectList = Tables<"prospect_lists">;

export type Prospect = Tables<"prospects"> & {
  // Read-only compatibility while legacy rows and the original home view are stabilized.
  name?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export type ProspectContact = Tables<"prospect_contacts">;

export type ProspectActivity = Tables<"prospect_activities">;

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

export const PROSPECT_PRIORITIES: string[] = ["A", "B", "C", "alta", "media", "baja"];
