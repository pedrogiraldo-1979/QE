"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmSupabaseClient } from "@/lib/supabase";
import {
  completeMasterSync,
  fetchCrmDashboard,
  fetchMasterSyncQueue,
  fetchPendingCustomerUpdates,
  reviewCustomerUpdate,
} from "@/lib/data/crmDashboardRepository";
import {
  getResponseId,
  initialData,
  type MasterSyncItem,
  type CustomerUpdateResponse,
  type DashboardData,
} from "@/features/crm/dashboardModel";
import type { Activity, Company, Contact, Prospect, ProspectActivity } from "@/lib/types";

export function useCrmDashboardData(supabase: CrmSupabaseClient, enabled: boolean) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customerResponses, setCustomerResponses] = useState<CustomerUpdateResponse[]>([]);
  const [customerResponsesLoading, setCustomerResponsesLoading] = useState(false);
  const [customerResponsesError, setCustomerResponsesError] = useState<string | null>(null);
  const [processingResponseId, setProcessingResponseId] = useState<string | null>(null);
  const [masterSyncQueue, setMasterSyncQueue] = useState<MasterSyncItem[]>([]);
  const [masterSyncLoading, setMasterSyncLoading] = useState(false);
  const [masterSyncError, setMasterSyncError] = useState<string | null>(null);
  const [processingMasterSyncId, setProcessingMasterSyncId] = useState<string | null>(null);

  const loadMasterSyncQueue = useCallback(async () => {
    setMasterSyncLoading(true);
    setMasterSyncError(null);
    const { data: queue, error } = await fetchMasterSyncQueue(supabase);

    if (error) {
      setMasterSyncQueue([]);
      setMasterSyncError(error.message);
      setMasterSyncLoading(false);
      return;
    }

    setMasterSyncQueue((queue || []) as MasterSyncItem[]);
    setMasterSyncLoading(false);
  }, [supabase]);

  const loadCustomerResponses = useCallback(async () => {
    setCustomerResponsesLoading(true);
    setCustomerResponsesError(null);
    const { data: responses, error } = await fetchPendingCustomerUpdates(supabase);

    if (error) {
      setCustomerResponses([]);
      setCustomerResponsesError(error.message);
      setCustomerResponsesLoading(false);
      return;
    }

    setCustomerResponses(((responses || []) as CustomerUpdateResponse[]).filter((response) => Boolean(getResponseId(response))));
    setCustomerResponsesLoading(false);
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const [companiesResult, contactsResult, activitiesResult, prospectsResult, prospectActivitiesResult] =
      await fetchCrmDashboard(supabase);

    if (companiesResult.error || contactsResult.error || activitiesResult.error) {
      setMessage(
        companiesResult.error?.message ||
          contactsResult.error?.message ||
          activitiesResult.error?.message ||
          "No pudimos cargar los datos.",
      );
      setLoading(false);
      return;
    }

    const companies = (companiesResult.data || []) as Company[];
    const contacts = (contactsResult.data || []) as Contact[];
    const activities = (activitiesResult.data || []) as Activity[];
    const prospects = prospectsResult.error ? [] : ((prospectsResult.data || []) as Prospect[]);
    const prospectActivities = prospectActivitiesResult.error ? [] : ((prospectActivitiesResult.data || []) as ProspectActivity[]);

    setData({ companies, contacts, activities, prospects, prospectActivities });
    if (prospectsResult.error || prospectActivitiesResult.error) {
      setMessage(prospectsResult.error?.message || prospectActivitiesResult.error?.message || "No pudimos cargar prospección.");
    }
    setLoading(false);
    void Promise.all([loadCustomerResponses(), loadMasterSyncQueue()]);
  }, [loadCustomerResponses, loadMasterSyncQueue, supabase]);

  useEffect(() => {
    if (enabled) void loadData();
  }, [enabled, loadData]);

  async function reviewCustomerResponse(response: CustomerUpdateResponse, action: "approve" | "reject") {
    const responseId = getResponseId(response);
    if (!responseId) return;

    setProcessingResponseId(responseId);
    const { error } = await reviewCustomerUpdate(supabase, action, responseId);

    if (error) {
      setMessage(error.message);
      setProcessingResponseId(null);
      return;
    }

    setCustomerResponses((current) => current.filter((item) => getResponseId(item) !== responseId));
    if (action === "approve") {
      await loadMasterSyncQueue();
      setMessage("Respuesta aprobada. Supabase quedó actualizado y la reconciliación de maestros está pendiente.");
    } else {
      setMessage("Respuesta rechazada.");
    }
    setProcessingResponseId(null);
  }

  async function markMasterSyncComplete(responseId: string) {
    const confirmed = window.confirm(
      "Confirma únicamente si Hoja1 y contactos_base ya fueron actualizados y verificados.",
    );
    if (!confirmed) return;

    setProcessingMasterSyncId(responseId);
    const { error } = await completeMasterSync(supabase, responseId);
    if (error) {
      setMessage(error.message);
      setProcessingMasterSyncId(null);
      return;
    }

    setMasterSyncQueue((current) => current.filter((item) => item.response_id !== responseId));
    setMessage("Maestros confirmados como sincronizados.");
    setProcessingMasterSyncId(null);
  }

  function resetData() {
    setData(initialData);
    setCustomerResponses([]);
    setMasterSyncQueue([]);
    setCustomerResponsesError(null);
    setMessage(null);
  }

  return {
    data,
    setData,
    loading,
    message,
    setMessage,
    customerResponses,
    customerResponsesLoading,
    customerResponsesError,
    processingResponseId,
    masterSyncQueue,
    masterSyncLoading,
    masterSyncError,
    processingMasterSyncId,
    loadData,
    loadCustomerResponses,
    loadMasterSyncQueue,
    reviewCustomerResponse,
    markMasterSyncComplete,
    resetData,
  };
}
