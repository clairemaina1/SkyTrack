import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseServer(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
