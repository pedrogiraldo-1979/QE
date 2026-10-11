import type { CrmSupabaseClient } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import {
  calculateCompanyContactCoverage,
  calculateOverdueFollowUps,
  type MetricActivity,
  type MetricSource,
} from "../../features/crm/operationalMetrics.ts";

const PAGE_SIZE = 500;
const MAX_ROWS = PAGE_SIZE * 20;
type MetricPage<T> = { data: T[] | null; count: number | null; error: unknown };
type ActivityRow = Pick<Tables<"activities">, "id" | "activity_type" | "due_date" | "completed">;

/** Completeness checks, not a transactional snapshot across pages or tables. */
export async function readCompleteMetricSource<T extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<MetricPage<T>>,
  signal: AbortSignal,
): Promise<MetricSource<T>> {
  const rows: T[] = [];
  const ids = new Set<string>();
  let total: number | null = null;
  try {
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      if (signal.aborted) return { status: "error" };
      const page = await fetchPage(from, from + PAGE_SIZE - 1);
      if (signal.aborted || page.error || !Array.isArray(page.data)) return { status: "error" };
      if (page.count === null || !Number.isSafeInteger(page.count) || page.count < 0 || page.count > MAX_ROWS) {
        return { status: "incomplete" };
      }
      if (total !== null && page.count !== total) return { status: "incomplete" };
      total = page.count;
      if (page.data.length !== Math.min(PAGE_SIZE, total - from)) return { status: "incomplete" };
      for (const row of page.data) {
        if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id)) return { status: "incomplete" };
        ids.add(row.id);
        rows.push(row);
      }
      if (rows.length === total) return { status: "complete", rows };
    }
  } catch {
    return { status: "error" };
  }
  return { status: "incomplete" };
}

function projectActivities(source: MetricSource<ActivityRow>): MetricSource<MetricActivity> {
  if (source.status !== "complete") return source;
  const rows: MetricActivity[] = [];
  const actions = new Set(["call", "email", "whatsapp", "follow_up", "meeting"]);
  for (const row of source.rows) {
    if (row.activity_type !== "note" && !actions.has(row.activity_type)) return { status: "error" };
    rows.push({
      kind: row.activity_type === "note" ? "note" : "follow_up",
      dueDate: row.due_date,
      completed: row.completed,
    });
  }
  return { status: "complete", rows };
}

export async function fetchOperationalMetrics(client: CrmSupabaseClient, signal: AbortSignal) {
  // These SELECTs use the existing session and RLS; no privileged fallback.
  const [companies, contacts, activities, prospectActivities] = await Promise.all([
    readCompleteMetricSource((from, to) => client.from("companies")
      .select("id", { count: "exact" }).order("id", { ascending: true }).range(from, to).retry(false).abortSignal(signal), signal),
    readCompleteMetricSource((from, to) => client.from("contacts")
      .select("id,company_id,full_name,email,phone", { count: "exact" }).order("id", { ascending: true }).range(from, to).retry(false).abortSignal(signal), signal),
    readCompleteMetricSource((from, to) => client.from("activities")
      .select("id,activity_type,due_date,completed", { count: "exact" }).order("id", { ascending: true }).range(from, to).retry(false).abortSignal(signal), signal),
    readCompleteMetricSource((from, to) => client.from("prospect_activities")
      .select("id,activity_type,due_date,completed", { count: "exact" }).order("id", { ascending: true }).range(from, to).retry(false).abortSignal(signal), signal),
  ]);
  return {
    coverage: calculateCompanyContactCoverage(companies, contacts),
    overdue: calculateOverdueFollowUps(projectActivities(activities), projectActivities(prospectActivities), new Date()),
  };
}

export type OperationalMetrics = Awaited<ReturnType<typeof fetchOperationalMetrics>>;
