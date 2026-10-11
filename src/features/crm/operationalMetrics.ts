/** Pure D-032 calculations. No data access or application consumers. */
export type MetricSource<T> =
  | { status: "complete"; rows: readonly T[] }
  | { status: "error" | "incomplete" };

export type MetricUnavailable = {
  status: "unavailable";
  reason: "source-error" | "incomplete-source" | "invalid-input";
};

export type MetricCompany = { id: string };
export type MetricContact = {
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type CompanyContactCoverage = MetricUnavailable | {
  status: "available";
  numerator: number;
  denominator: number;
  /** Null means no population, not zero coverage. Presentation rounds later. */
  percentage: number | null;
};

export function calculateCompanyContactCoverage(
  companies: MetricSource<MetricCompany>,
  contacts: MetricSource<MetricContact>,
): CompanyContactCoverage {
  if (companies.status === "error" || contacts.status === "error") {
    return { status: "unavailable", reason: "source-error" };
  }
  if (companies.status !== "complete" || contacts.status !== "complete") {
    return { status: "unavailable", reason: "incomplete-source" };
  }

  const companyIds = new Set(companies.rows.map((company) => company.id));
  const coveredCompanyIds = new Set<string>();
  for (const contact of contacts.rows) {
    if (!contact.company_id || !companyIds.has(contact.company_id) || !contact.full_name?.trim()) continue;
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email?.trim() ?? "");
    const validPhone = (contact.phone ?? "").replace(/\D/g, "").length >= 7;
    if (validEmail || validPhone) coveredCompanyIds.add(contact.company_id);
  }

  const numerator = coveredCompanyIds.size;
  const denominator = companyIds.size;
  return {
    status: "available", numerator, denominator,
    percentage: denominator === 0 ? null : numerator / denominator * 100,
  };
}

/** Local projection only: a future adapter must verify remote type/state semantics. */
export type MetricActivity = {
  kind: "follow_up" | "note";
  dueDate: string | null;
  completed: boolean | null;
};

export type OverdueFollowUps = MetricUnavailable | { status: "available"; count: number };

export function calculateOverdueFollowUps(
  companyActivities: MetricSource<MetricActivity>,
  prospectActivities: MetricSource<MetricActivity>,
  asOf: Date,
): OverdueFollowUps {
  if (companyActivities.status === "error" || prospectActivities.status === "error") {
    return { status: "unavailable", reason: "source-error" };
  }
  if (companyActivities.status !== "complete" || prospectActivities.status !== "complete") {
    return { status: "unavailable", reason: "incomplete-source" };
  }
  if (!Number.isFinite(asOf.getTime())) return { status: "unavailable", reason: "invalid-input" };

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(asOf);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const today = `${value("year")}-${value("month")}-${value("day")}`;

  let count = 0;
  for (const activities of [companyActivities.rows, prospectActivities.rows]) {
    for (const activity of activities) {
      if (activity.kind === "note" || activity.completed === true || activity.dueDate === null) continue;
      if (activity.completed !== false || !isCivilDate(activity.dueDate)) {
        return { status: "unavailable", reason: "invalid-input" };
      }
      if (activity.dueDate < today) count += 1;
    }
  }
  return { status: "available", count };
}

function isCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
