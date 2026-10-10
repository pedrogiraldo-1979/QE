import type { OperationalMetrics } from "@/lib/data/operationalMetricsRepository";

export type OperationalMetricsState =
  | { status: "idle" | "loading" }
  | { status: "ready"; metrics: OperationalMetrics };

const unavailable = (): OperationalMetrics => ({
  coverage: { status: "unavailable", reason: "source-error" },
  overdue: { status: "unavailable", reason: "source-error" },
});

/** Per-instance lifecycle, never a shared cache of CRM data. */
export function createOperationalMetricsLoader(
  fetchMetrics: (signal: AbortSignal) => Promise<OperationalMetrics>,
  onChange: (state: OperationalMetricsState) => void,
) {
  let generation = 0;
  let active: AbortController | null = null;

  async function refresh() {
    const current = ++generation;
    active?.abort();
    const controller = new AbortController();
    active = controller;
    onChange({ status: "loading" });
    const timer = setTimeout(() => controller.abort(), 15_000);
    let rejectAborted: () => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAborted = () => reject(new Error("metric-request-aborted"));
      controller.signal.addEventListener("abort", rejectAborted, { once: true });
    });
    try {
      const metrics = await Promise.race([fetchMetrics(controller.signal), aborted]);
      if (current === generation && !controller.signal.aborted) onChange({ status: "ready", metrics });
    } catch {
      if (current === generation) onChange({ status: "ready", metrics: unavailable() });
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", rejectAborted);
      if (active === controller) active = null;
    }
  }

  function clear() {
    generation += 1;
    active?.abort();
    active = null;
    onChange({ status: "idle" });
  }

  return { refresh, clear };
}
