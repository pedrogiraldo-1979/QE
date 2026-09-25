export type CrmRole = "admin" | "member";

export type GovernedDataTab = "pending" | "responses" | "sync";

export interface CrmSessionContext {
  authorized: boolean;
  role: CrmRole | null;
}

export function parseCrmSessionContext(value: unknown): CrmSessionContext | null {
  if (!isRecord(value) || typeof value.authorized !== "boolean") return null;

  const role = value.role;
  if (role !== null && role !== "admin" && role !== "member") return null;
  if (value.authorized !== (role !== null)) return null;

  return { authorized: value.authorized, role };
}

export function isCrmAdmin(role: CrmRole | null): role is "admin" {
  return role === "admin";
}

export function getAllowedDataTabs(role: CrmRole | null): GovernedDataTab[] {
  return isCrmAdmin(role) ? ["pending", "responses", "sync"] : ["pending"];
}

export function coerceDataTabForRole(tab: GovernedDataTab, role: CrmRole | null): GovernedDataTab {
  return getAllowedDataTabs(role).includes(tab) ? tab : "pending";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
