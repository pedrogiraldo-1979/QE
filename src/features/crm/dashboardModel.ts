import { normalizeProspectStatus } from "../../lib/prospectOperations.ts";
import {
  COMPANY_STATUSES,
  type Activity,
  type ActivityType,
  type Company,
  type CompanyStatus,
  type Contact,
  type Prospect,
  type ProspectActivity,
  type ProspectStatus,
} from "../../lib/types.ts";

export type ViewMode = "home" | "prospecting" | "companies" | "contacts" | "activities" | "data";

export interface DashboardData {
  companies: Company[];
  contacts: Contact[];
  activities: Activity[];
  prospects: Prospect[];
  prospectActivities: ProspectActivity[];
}

export interface DataIssueGroup {
  id: string;
  type: "company" | "contact";
  title: string;
  subtitle: string;
  issues: string[];
  companyId: string | null;
}

export type DataTab = "pending" | "responses";

export type CustomerUpdateResponse = Record<string, unknown> & {
  response_id?: string | number | null;
  id?: string | number | null;
  cliente_id?: string | null;
  company_id?: string | null;
  nombre_cliente?: string | null;
  company_name?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  payload?: Record<string, unknown> | null;
};

export interface CustomerUpdateChange {
  label: string;
  currentValue: string;
  newValue: string;
}

export const initialData: DashboardData = {
  companies: [],
  contacts: [],
  activities: [],
  prospects: [],
  prospectActivities: [],
};

export const statusLabels: Record<CompanyStatus, string> = {
  nuevo: "Estado por validar",
  "por validar": "Por validar",
  contactado: "Contactado",
  interesado: "Interesado",
  cotizado: "Cotizado",
  cliente: "Cliente activo",
  descartado: "Descartado",
};

export const activityTypeLabels: Record<ActivityType, string> = {
  note: "Nota",
  call: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  follow_up: "Seguimiento",
  meeting: "Reunión",
};

export const prospectStatusLabels: Record<ProspectStatus, string> = {
  nuevo: "Nuevo",
  por_revisar: "Por revisar",
  ok_prospecto: "OK prospecto",
  cliente_actual_excluir: "Cliente actual",
  sin_contacto: "Sin contacto",
  contacto_pendiente: "Contacto pendiente",
  convertido_cliente: "Convertido a cliente",
  descartado: "Descartado",
};

export const statusTone: Record<CompanyStatus, string> = {
  nuevo: "tone-slate",
  "por validar": "tone-amber",
  contactado: "tone-blue",
  interesado: "tone-green",
  cotizado: "tone-violet",
  cliente: "tone-emerald",
  descartado: "tone-muted",
};

export const prospectStatusTone: Record<ProspectStatus, string> = {
  nuevo: "tone-slate",
  por_revisar: "tone-amber",
  ok_prospecto: "tone-green",
  cliente_actual_excluir: "tone-muted",
  sin_contacto: "tone-slate",
  contacto_pendiente: "tone-blue",
  convertido_cliente: "tone-emerald",
  descartado: "tone-muted",
};

export function normalizeStatus(status?: string | null): CompanyStatus {
  return COMPANY_STATUSES.includes(status as CompanyStatus) ? (status as CompanyStatus) : "nuevo";
}

export function formatActivityType(type: ActivityType | string) {
  return activityTypeLabels[type as ActivityType] || type || "Actividad";
}

export function formatContactRole(role?: string | null) {
  const normalized = role?.toLowerCase().trim();
  if (!normalized) return "Rol pendiente";
  if (normalized.includes("compra")) return "Contacto de compras";
  if (normalized.includes("chef") || normalized.includes("cocina")) return "Contacto de cocina/chef";
  if (normalized.includes("pago") || normalized.includes("tesorer") || normalized.includes("factur")) return "Contacto de pagos";
  return role || "Rol pendiente";
}

export function getContactIssues(contact: Contact) {
  const issues: string[] = [];
  if (!contact.email?.trim()) issues.push("Sin email");
  if (!contact.role?.trim()) issues.push("Rol pendiente");
  if (!contact.phone?.trim()) issues.push("Teléfono pendiente");
  if (contact.email?.trim() && hasMultipleOrInvalidEmail(contact.email)) issues.push("Email múltiple o inválido");
  return issues;
}

export function hasMultipleOrInvalidEmail(email: string) {
  const parts = email.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return true;
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getCompanyIssues(company: Company) {
  const issues: string[] = [];
  if (normalizeStatus(company.status) === "por validar") issues.push("Datos pendientes de validar");
  if (!company.nit?.trim()) issues.push("NIT pendiente");
  if (!company.phone?.trim()) issues.push("Teléfono pendiente");
  if (!company.address?.trim()) issues.push("Dirección de entrega pendiente");
  return issues;
}

export function isInFollowUp(company: Company) {
  return ["contactado", "interesado", "cotizado"].includes(normalizeStatus(company.status));
}

export function isOverdue(
  activity: { due_date: string | null; completed: boolean | null },
  now = new Date(),
) {
  if (!activity.due_date || activity.completed) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return new Date(`${activity.due_date}T00:00:00`) < today;
}

export function getNextActivity<T extends { due_date: string | null; completed: boolean | null }>(activities: T[]) {
  return [...activities]
    .filter((activity) => !activity.completed)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })[0] || null;
}

export function buildConvertedProspectNotes(prospect: Prospect) {
  const details = [
    "Convertido desde prospección.",
    prospect.source ? `Origen: ${prospect.source}.` : "",
    prospect.contact_name ? `Contacto prospecto: ${prospect.contact_name}.` : "",
    prospect.contact_email ? `Email prospecto: ${prospect.contact_email}.` : "",
    prospect.contact_phone ? `Teléfono prospecto: ${prospect.contact_phone}.` : "",
    prospect.notes || "",
  ].filter(Boolean);

  return details.join("\n");
}

export function countByStatus(companies: Company[], status: CompanyStatus) {
  return companies.filter((company) => normalizeStatus(company.status) === status).length;
}

export function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function filterDataIssues(issues: DataIssueGroup[], normalizedSearch: string) {
  if (!normalizedSearch) return issues;
  return issues.filter((issue) =>
    [issue.title, issue.subtitle, issue.type, ...issue.issues].some((value) => value.toLowerCase().includes(normalizedSearch)),
  );
}

export function filterCustomerResponses(responses: CustomerUpdateResponse[], normalizedSearch: string) {
  if (!normalizedSearch) return responses;
  return responses.filter((response) => {
    const changes = getResponseChanges(response);
    return [
      getResponseCustomerName(response),
      getResponseSubtitle(response),
      getResponseDate(response),
      ...changes.flatMap((change) => [change.label, change.currentValue, change.newValue]),
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

export function getResponseId(response: CustomerUpdateResponse) {
  const value = response.response_id ?? response.id;
  return value === null || value === undefined ? "" : String(value);
}

export function getResponseCustomerName(response: CustomerUpdateResponse) {
  return readResponseValue(response, ["nombre_cliente", "company_name", "cliente_nombre", "name"]) || "Cliente sin nombre";
}

export function getResponseSubtitle(response: CustomerUpdateResponse) {
  return readResponseValue(response, ["cliente_id", "company_id", "nit", "segmento"]) || "Formulario público";
}

export function getResponseDate(response: CustomerUpdateResponse) {
  return readResponseValue(response, ["submitted_at", "created_at", "updated_at"]) || "-";
}

export function getResponseChanges(response: CustomerUpdateResponse): CustomerUpdateChange[] {
  const fields = [
    { label: "Razón social", current: ["razon_social_actual", "razon_social", "legal_name"], next: ["razon_social_nueva"] },
    { label: "NIT", current: ["nit_actual", "nit"], next: ["nit_nuevo"] },
    { label: "Contacto comercial", current: ["contacto_actual", "contacto_comercial_actual"], next: ["contacto_comercial_nuevo"] },
    { label: "Cargo contacto", current: ["cargo_contacto_actual", "rol_actual"], next: ["cargo_contacto_nuevo"] },
    { label: "Teléfono comercial", current: ["telefono_actual", "celular_comercial_actual"], next: ["celular_comercial_nuevo"] },
    { label: "Correo comercial", current: ["correo_actual", "correo_comercial_actual"], next: ["correo_comercial_nuevo"] },
    { label: "Contacto de pagos", current: ["contacto_pagos_actual"], next: ["contacto_pagos_nuevo"] },
    { label: "Cargo pagos", current: ["cargo_pagos_actual"], next: ["cargo_pagos_nuevo"] },
    { label: "Teléfono tesorería", current: ["telefono_tesoreria_actual"], next: ["telefono_tesoreria_nuevo"] },
    { label: "Correo tesorería", current: ["correo_tesoreria_actual"], next: ["correo_tesoreria_nuevo"] },
    { label: "Correo facturación", current: ["correo_facturacion_actual"], next: ["correo_facturacion_nuevo"] },
    { label: "Dirección", current: ["direccion_actual", "address"], next: ["direccion_nueva"] },
    { label: "Observaciones", current: [], next: ["observaciones_cliente"] },
  ];

  const changes = fields
    .map((field) => {
      const currentValue = readResponseValue(response, field.current);
      const newValue = readResponseValue(response, field.next);
      return { label: field.label, currentValue, newValue };
    })
    .filter((change) => change.newValue && normalizeComparable(change.currentValue) !== normalizeComparable(change.newValue));

  if (changes.length) return changes;
  if (readResponseValue(response, ["confirm_no_changes"]) === "true") {
    return [{ label: "Confirmación", currentValue: "Datos registrados", newValue: "Cliente confirma sin cambios" }];
  }
  return [{ label: "Respuesta", currentValue: "-", newValue: "Sin diferencias detectadas en campos conocidos" }];
}

export function getPageTitle(viewMode: ViewMode) {
  if (viewMode === "home") return "Resumen comercial";
  if (viewMode === "prospecting") return "Prospección";
  if (viewMode === "contacts") return "Directorio comercial";
  if (viewMode === "activities") return "Agenda de seguimiento";
  if (viewMode === "data") return "Datos pendientes de validar";
  return "Clientes actuales";
}

export function getViewTitle(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Prospección";
  if (viewMode === "contacts") return "Contactos comerciales";
  if (viewMode === "activities") return "Seguimiento";
  if (viewMode === "data") return "Actualización de datos";
  return "Clientes";
}

export function getViewHeading(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Prospectos";
  if (viewMode === "contacts") return "Contactos comerciales";
  if (viewMode === "activities") return "Agenda de seguimiento";
  if (viewMode === "data") return "Datos pendientes de validar";
  return "Base de clientes";
}

export function getSearchPlaceholder(viewMode: ViewMode) {
  if (viewMode === "prospecting") return "Buscar prospecto, contacto, origen o segmento";
  if (viewMode === "contacts") return "Buscar contacto, cliente, rol o email";
  if (viewMode === "activities") return "Buscar cliente, seguimiento o nota";
  if (viewMode === "data") return "Buscar pendiente, cliente o contacto";
  return "Buscar por cliente, NIT, ciudad o segmento";
}

export function getResultCount(
  viewMode: ViewMode,
  companies: Company[],
  contacts: Contact[],
  activities: Activity[],
  dataIssues: DataIssueGroup[],
  customerResponses: CustomerUpdateResponse[],
  dataTab: DataTab,
  prospects: Prospect[],
) {
  if (viewMode === "prospecting") return prospects.length;
  if (viewMode === "contacts") return contacts.length;
  if (viewMode === "activities") return activities.length;
  if (viewMode === "data") return dataTab === "responses" ? customerResponses.length : dataIssues.length;
  return companies.length;
}

function getResponsePayload(response: CustomerUpdateResponse) {
  return isRecord(response.payload) ? response.payload : {};
}

function readResponseValue(response: CustomerUpdateResponse, keys: string[]) {
  const payload = getResponsePayload(response);
  for (const key of keys) {
    const direct = response[key];
    if (direct !== null && direct !== undefined && String(direct).trim()) return String(direct);
    const payloadValue = payload[key];
    if (payloadValue !== null && payloadValue !== undefined && String(payloadValue).trim()) return String(payloadValue);
  }
  return "";
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
