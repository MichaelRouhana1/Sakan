import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { parseCampusFilter } from "@/lib/universities";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  type WaitlistSignupRow,
} from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role"); // all | student | landlord
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const university = searchParams.get("university");
  const campusFilter = parseCampusFilter(searchParams.get("campus") ?? "");
  const area = searchParams.get("area");
  const betaOnly = searchParams.get("beta") === "1";

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (role === "student" || role === "landlord") {
    query = query.eq("role", role);
  }
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (university) query = query.eq("university", university);
  if (campusFilter) {
    query = query
      .eq("university", campusFilter.university)
      .eq("campus", campusFilter.campus);
  }
  if (area) query = query.ilike("area_city", `%${area}%`);
  if (betaOnly) query = query.eq("beta_tester", true);

  const { data, error } = await query.limit(5000);
  if (error) {
    console.error("admin stats error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as WaitlistSignupRow[];

  const byDay = new Map<string, number>();
  const studentsByUniversity = new Map<string, number>();
  const byCampus = new Map<string, number>();
  const landlordsByArea = new Map<string, number>();
  const landlordsByUnits = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  let students = 0;
  let landlords = 0;
  let betaTesters = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    if (row.role === "student") {
      students += 1;
      if (row.university) {
        studentsByUniversity.set(
          row.university,
          (studentsByUniversity.get(row.university) ?? 0) + 1,
        );
      }
    } else {
      landlords += 1;
      if (row.area_city) {
        landlordsByArea.set(
          row.area_city,
          (landlordsByArea.get(row.area_city) ?? 0) + 1,
        );
      }
      if (row.unit_count) {
        landlordsByUnits.set(
          row.unit_count,
          (landlordsByUnits.get(row.unit_count) ?? 0) + 1,
        );
      }
    }

    if (row.university && row.campus) {
      const label = `${row.university} — ${row.campus}`;
      byCampus.set(label, (byCampus.get(label) ?? 0) + 1);
    }

    if (row.beta_tester) betaTesters += 1;
    if (row.referred_by) {
      referrerCounts.set(
        row.referred_by,
        (referrerCounts.get(row.referred_by) ?? 0) + 1,
      );
    }
  }

  const codeToEmail = new Map(
    rows.map((r) => [r.referral_code, r.email] as const),
  );

  const topReferrers = [...referrerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([code, count]) => ({
      code,
      count,
      email: codeToEmail.get(code) ?? null,
    }));

  return NextResponse.json({
    total: rows.length,
    students,
    landlords,
    betaTesters,
    byDay: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count })),
    studentsByUniversity: [...studentsByUniversity.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    byCampus: [...byCampus.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    landlordsByArea: [...landlordsByArea.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    landlordsByUnits: [...landlordsByUnits.entries()].map(([name, count]) => ({
      name,
      count,
    })),
    topReferrers,
    recent: rows.slice(0, 50).map((r) => ({
      id: r.id,
      role: r.role,
      fullName: r.full_name,
      email: r.email,
      university: r.university,
      campus: r.campus,
      areaCity: r.area_city,
      unitCount: r.unit_count,
      betaTester: r.beta_tester,
      referralCode: r.referral_code,
      referredBy: r.referred_by,
      createdAt: r.created_at,
    })),
  });
}
