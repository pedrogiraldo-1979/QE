"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getResponseId,
  initialData,
  type CustomerUpdateResponse,
  type DashboardData,
} from "@/features/crm/dashboardModel";
import type { Activity, Company, Contact, Prospect, ProspectActivity } from "@/lib/types";

export function useCrmDashboardData(supabase: SupabaseClient, enabled: boolean) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customerResponses, setCustomerResponses] = useState<CustomerUpdateResponse[]>([]);
  const [customerResponsesLoading, setCustomerResponsesLoading] = useState(false);
  const [customerResponsesError, setCustomerResponsesError] = useState<string | null>(null);
  const [processingResponseId, setProcessingResponseId] = useState<string | null>(null);

  const loadCustomerResponses = useCallback(async () => {
    setCustomerResponsesLoading(true);
    setCustomerResponsesError(null);
    const { data: responses, error } = await supabase.rpc("get_cu_pending_reviews");

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

    const [companiesResult, contactsResult, activitiesResult, prospectsResult, prospectActivitiesResult] = await Promise.all([
      supabase.from("companies").select("*").order("name", { ascending: true }),
      supabase.from("contacts").select("*").order("company_name", { ascending: true }),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
      supabase.from("prospects").select("*").order("company_name", { ascending: true }),
      supabase.from("prospect_activities").select("*").order("created_at", { ascending: false }),
    ]);

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
    void loadCustomerResponses();
  }, [loadCustomerResponses, supabase]);

  useEffect(() => {
    if (enabled) void loadData();
  }, [enabled, loadData]);

  async function reviewCustomerResponse(response: CustomerUpdateResponse, action: "approve" | "reject") {
    const responseId = getResponseId(response);
    if (!responseId) return;

    setProcessingResponseId(responseId);
    const rpcName = action === "approve" ? "approve_cu_response" : "reject_cu_response";
    const { error } = await supabase.rpc(rpcName, { response_id: responseId });

    if (error) {
      setMessage(error.message);
      setProcessingResponseId(null);
      return;
    }

    setCustomerResponses((current) => current.filter((item) => getResponseId(item) !== responseId));
    setMessage(action === "approve" ? "Respuesta aprobada." : "Respuesta rechazada.");
    setProcessingResponseId(null);
  }

  function resetData() {
    setData(initialData);
    setCustomerResponses([]);
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
    loadData,
    loadCustomerResponses,
    reviewCustomerResponse,
    resetData,
  };
}
