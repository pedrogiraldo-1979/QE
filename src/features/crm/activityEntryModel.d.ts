import type { Database } from "@/lib/database.types";

export type ActivityEntryTarget = {
  key: string;
  id: string;
  name: string;
  segment: string | null;
  source: "cliente" | "prospecto";
};

export type ActivityEntryCompany = { id: string; name: string | null; segment: string | null };
export type ActivityEntryProspect = { id: string; company_name: string | null; segment: string | null };
export type ActivityEntryFields = { activityType: string; dueDate: string; notes: string };

export function normalizeActivitySearch(value: string): string;
export function normalizeActivityNotes(value: string): string;
export function buildActivityTargets(
  companies: ActivityEntryCompany[],
  prospects: ActivityEntryProspect[],
): ActivityEntryTarget[];
export function filterActivityTargets(
  targets: ActivityEntryTarget[],
  targetSearch: string,
): ActivityEntryTarget[];
export function validateActivityEntry(
  selectedTarget: ActivityEntryTarget | null,
  notes: string,
): string | null;
export function buildActivityInsert(
  target: Pick<ActivityEntryTarget, "id" | "source">,
  fields: ActivityEntryFields,
):
  | { table: "activities"; payload: Database["public"]["Tables"]["activities"]["Insert"] }
  | { table: "prospect_activities"; payload: Database["public"]["Tables"]["prospect_activities"]["Insert"] };

