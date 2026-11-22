import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type WaitlistSignupRow = {
  id: string;
  role: "student" | "landlord";
  full_name: string;
  email: string;
  whatsapp: string | null;
  university: string | null;
  campus: string | null;
  housing_timing: string | null;
  area_city: string | null;
  unit_count: string | null;
  beta_tester: boolean;
  referral_code: string;
  referred_by: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  user_agent: string | null;
  created_at: string;
};

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
