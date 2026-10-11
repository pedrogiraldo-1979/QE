"use client";

import { useEffect, useMemo, useState } from "react";
import type { CrmSupabaseClient } from "@/lib/supabase";
import { fetchOperationalMetrics } from "@/lib/data/operationalMetricsRepository";
import { createOperationalMetricsLoader, type OperationalMetricsState } from "@/features/crm/operationalMetricsLoader";

const IDLE: OperationalMetricsState = { status: "idle" };

export function useOperationalMetrics(client: CrmSupabaseClient, enabled: boolean) {
  const [state, setState] = useState<OperationalMetricsState>(IDLE);
  const [authEpoch, setAuthEpoch] = useState(0);
  const loader = useMemo(() => createOperationalMetricsLoader(
    (signal) => fetchOperationalMetrics(client, signal), setState,
  ), [client]);

  useEffect(() => {
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      // Invalidate even when the next identity has the same CRM role.
      loader.clear();
      setAuthEpoch((current) => current + 1);
    });
    return () => { subscription.unsubscribe(); loader.clear(); };
  }, [client, loader]);

  useEffect(() => {
    if (enabled) void loader.refresh();
    else loader.clear();
    return () => loader.clear();
  }, [enabled, authEpoch, loader]);

  return {
    state: enabled ? state : IDLE,
    refresh: () => enabled ? loader.refresh() : Promise.resolve(),
  };
}
