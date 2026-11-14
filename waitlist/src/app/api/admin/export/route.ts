import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  type WaitlistSignupRow,
} from "@/lib/supabase";

export const runtime = "nodejs";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
  return str;
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return new Response("Supabase is not configured", { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "student" || role === "landlord") {
    query = query.eq("role", role);
  }

  const { data, error } = await query.limit(10000);
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []) as WaitlistSignupRow[];
  const header = [
    "id",
    "role",
    "full_name",
    "email",
    "whatsapp",
    "university",
    "housing_timing",
    "area_city",
    "unit_count",
    "beta_tester",
    "referral_code",
    "referred_by",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "created_at",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.role,
        r.full_name,
        r.email,
        r.whatsapp,
        r.university,
        r.housing_timing,
        r.area_city,
        r.unit_count,
        r.beta_tester,
        r.referral_code,
        r.referred_by,
        r.utm_source,
        r.utm_medium,
        r.utm_campaign,
        r.created_at,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="studently-waitlist-${Date.now()}.csv"`,
    },
  });
}
