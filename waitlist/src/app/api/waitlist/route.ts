import { NextResponse } from "next/server";
import { sendConfirmationEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { buildReferralUrl, createReferralCode } from "@/lib/referral";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { resolveStoredPlace } from "@/lib/universities";
import {
  normalizeWhatsApp,
  signupSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`waitlist:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Please check your details";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;
  const place = resolveStoredPlace({
    ...data,
    universityRequired: data.role === "student",
  });
  if (!place.ok) {
    return NextResponse.json({ error: place.message }, { status: 400 });
  }

  // Honeypot filled → pretend success
  if (data.website && data.website.length > 0) {
    return NextResponse.json({
      ok: true,
      referralCode: "HIDDEN",
      referralUrl: buildReferralUrl("HIDDEN", data.role),
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Sign-ups are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdmin();
  const whatsapp = normalizeWhatsApp(data.whatsapp);
  const referralCode = createReferralCode();
  const referredBy = data.referralCode?.trim().toUpperCase() || null;

  let validReferrer: string | null = null;
  if (referredBy) {
    const { data: referrer } = await supabase
      .from("waitlist_signups")
      .select("referral_code")
      .eq("referral_code", referredBy)
      .maybeSingle();
    validReferrer = referrer?.referral_code ?? null;
  }

  const row = {
    role: data.role,
    full_name: data.fullName,
    email: data.email,
    whatsapp,
    university: place.place.university,
    campus: place.place.campus,
    housing_timing: data.role === "student" ? data.housingTiming : null,
    area_city: data.role === "landlord" ? data.areaCity : null,
    unit_count: data.role === "landlord" ? data.unitCount : null,
    beta_tester: data.betaTester,
    referral_code: referralCode,
    referred_by: validReferrer,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
    user_agent: request.headers.get("user-agent")?.slice(0, 400) || null,
  };

  const { data: inserted, error } = await supabase
    .from("waitlist_signups")
    .insert(row)
    .select("id, referral_code, role, email, full_name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "That email is already on this waitlist. Check your inbox for the confirmation.",
        },
        { status: 409 },
      );
    }
    console.error("waitlist insert error", error);
    return NextResponse.json(
      { error: "Could not save your sign-up. Please try again." },
      { status: 500 },
    );
  }

  const referralUrl = buildReferralUrl(inserted.referral_code, inserted.role);

  const emailResult = await sendConfirmationEmail({
    to: inserted.email,
    fullName: inserted.full_name,
    role: inserted.role,
    referralUrl,
  });

  if (!emailResult.sent) {
    console.warn("confirmation email skipped/failed", emailResult.error);
  }

  return NextResponse.json({
    ok: true,
    referralCode: inserted.referral_code,
    referralUrl,
    emailSent: emailResult.sent,
  });
}
