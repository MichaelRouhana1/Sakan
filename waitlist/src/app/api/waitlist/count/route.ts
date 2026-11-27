import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";
export const revalidate = 30;

const querySchema = z.object({
  role: z.enum(["student", "landlord"]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    role: searchParams.get("role"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ count: 0, configured: false });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true })
      .eq("role", parsed.data.role);

    if (error) {
      console.error("count error", error);
      return NextResponse.json({ count: 0, configured: true });
    }

    return NextResponse.json(
      { count: count ?? 0, configured: true },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("count failed", err);
    return NextResponse.json({ count: 0, configured: false });
  }
}
