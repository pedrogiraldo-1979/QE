import type { CrmSupabaseClient } from "@/lib/supabase";
import {
  ACTIVITY_COLUMNS,
  COMPANY_COLUMNS,
  CONTACT_COLUMNS,
  PROSPECT_ACTIVITY_COLUMNS,
  PROSPECT_COLUMNS,
} from "@/lib/data/queryColumns";

export function fetchCrmDashboard(client: CrmSupabaseClient) {
  return Promise.all([
    client.from("companies").select(COMPANY_COLUMNS).order("name", { ascending: true }),
    client.from("contacts").select(CONTACT_COLUMNS).order("company_name", { ascending: true }),
    client.from("activities").select(ACTIVITY_COLUMNS).order("created_at", { ascending: false }),
    client.from("prospects").select(PROSPECT_COLUMNS).order("company_name", { ascending: true }),
    client.from("prospect_activities").select(PROSPECT_ACTIVITY_COLUMNS).order("created_at", { ascending: false }),
  ]);
}

export function fetchPendingCustomerUpdates(client: CrmSupabaseClient) {
  return client.rpc("get_cu_pending_reviews");
}

export function reviewCustomerUpdate(
  client: CrmSupabaseClient,
  action: "approve" | "reject",
  responseId: string,
) {
  const rpcName = action === "approve" ? "approve_cu_response" : "reject_cu_response";
  return client.rpc(rpcName, { p_response_id: responseId });
}
