import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type CrmSupabaseClient = SupabaseClient<Database>;

let browserClient: CrmSupabaseClient | null = null;

export function getSupabaseClient(): CrmSupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (typeof window === "undefined") {
      return createClient<Database>("https://placeholder.supabase.co", "placeholder");
    }

    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseKey);
  return browserClient;
}
