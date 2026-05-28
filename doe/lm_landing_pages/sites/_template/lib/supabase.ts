import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export function getAllowedColumns(): string[] {
  const raw =
    process.env.LEAD_COLUMNS ??
    "first_name,last_name,email,campaign_slug,user_agent,ip,created_at";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
