"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import {
  HOUSING_TIMINGS,
  UNIT_COUNTS,
  type WaitlistRole,
} from "@/lib/constants";
import type { PageContent } from "@/lib/content";
import { SearchSelect } from "@/components/SearchSelect";
import {
  INSTITUTIONS_BY_SHORT_NAME,
  OTHER_UNIVERSITY,
  institutionByShortName,
  resolveStoredPlace,
} from "@/lib/universities";

type SignupFormProps = {
  content: PageContent;
};

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  university: string;
  universityOther: string;
  campus: string;
  housingTiming: string;
  areaCity: string;
  unitCount: string;
  betaTester: boolean;
  website: string;
};

const initial = (role: WaitlistRole): FormState => ({
  fullName: "",
  email: "",
  whatsapp: "+961",
  university: "",
  universityOther: "",
  campus: "",
  housingTiming: "",
  areaCity: "",
  unitCount: "",
  betaTester: false,
  website: "",
});

export function SignupForm({ content }: SignupFormProps) {
  const posthog = usePostHog();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(() => initial(content.role));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [success, setSuccess] = useState<{
    referralCode: string;
    referralUrl: string;
  } | null>(null);

  const utm = useMemo(
    () => ({
      referralCode: searchParams.get("ref") || undefined,
      utmSource: searchParams.get("utm_source") || undefined,
      utmMedium: searchParams.get("utm_medium") || undefined,
      utmCampaign: searchParams.get("utm_campaign") || undefined,
    }),
    [searchParams],
  );

  useEffect(() => {
    setForm(initial(content.role));
    setSuccess(null);
    setError(null);
    setStarted(false);
  }, [content.role]);

  function markStarted() {
    if (started) return;
    setStarted(true);
    posthog?.capture("waitlist_form_started", {
      role: content.role,
      referral_code: utm.referralCode,
      utm_source: utm.utmSource,
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markStarted();
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectUniversity(next: string) {
    markStarted();
    setForm((prev) => {
      if (prev.university === next) return prev;
      const institution = institutionByShortName(next);
      const campus =
        institution && institution.campuses.length === 1
          ? institution.campuses[0].name
          : "";
      return {
        ...prev,
        university: next,
        universityOther: "",
        campus,
      };
    });
  }

  const universityOptions = [
    ...(content.role === "landlord"
      ? [{ value: "", label: "No preference" }]
      : []),
    ...INSTITUTIONS_BY_SHORT_NAME.map((institution) => ({
      value: institution.shortName,
      label: `${institution.shortName} — ${institution.name}`,
    })),
    { value: OTHER_UNIVERSITY, label: OTHER_UNIVERSITY },
  ];
  const selectedInstitution = institutionByShortName(form.university);
  const campusOptions =
    selectedInstitution && selectedInstitution.campuses.length > 1
      ? selectedInstitution.campuses.map((campus) => ({
          value: campus.name,
          label: campus.name,
        }))
      : [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const place = {
    university: form.university,
    universityOther: form.universityOther,
    campus: form.campus,
  };
  const payload =
      content.role === "student"
        ? {
            role: "student" as const,
            fullName: form.fullName,
            email: form.email,
            whatsapp: form.whatsapp,
            ...place,
            housingTiming: form.housingTiming,
            betaTester: form.betaTester,
            website: form.website,
            ...utm,
          }
        : {
            role: "landlord" as const,
            fullName: form.fullName,
            email: form.email,
            whatsapp: form.whatsapp,
            areaCity: form.areaCity,
            unitCount: form.unitCount,
            ...place,
            betaTester: form.betaTester,
            website: form.website,
            ...utm,
          };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      posthog?.identify(form.email, {
        email: form.email,
        name: form.fullName,
        waitlist_role: content.role,
      });

      const stored = resolveStoredPlace({
        ...place,
        universityRequired: content.role === "student",
      });
      posthog?.capture("waitlist_signup", {
        role: content.role,
        university: stored.ok ? stored.place.university ?? undefined : undefined,
        campus: stored.ok ? stored.place.campus ?? undefined : undefined,
        area: content.role === "landlord" ? form.areaCity : undefined,
        unit_count: content.role === "landlord" ? form.unitCount : undefined,
        beta_tester: form.betaTester,
        referral_code: utm.referralCode,
      });

      setSuccess({
        referralCode: data.referralCode,
        referralUrl: data.referralUrl,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const waText = encodeURIComponent(
      content.role === "student"
        ? `I'm joining Studently to find dorms in Lebanon. Join with my link: ${success.referralUrl}`
        : `I'm listing on Studently to reach students. Join the landlord waitlist: ${success.referralUrl}`,
    );

    return (
      <div className="animate-rise rounded-2xl bg-white/90 p-5 ring-1 ring-black/5 backdrop-blur sm:p-6">
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">
          You’re in
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Thanks for joining. Share your link so friends move up with you.
        </p>
        <div className="mt-4 break-all rounded-xl bg-brand-mist px-3 py-3 text-sm font-medium text-ink">
          {success.referralUrl}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 min-w-[140px]"
          >
            Share on WhatsApp
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 min-w-[140px]"
          >
            Open Instagram
          </a>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Tip: copy your link into an Instagram story or DM.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-base text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form
      onSubmit={onSubmit}
      className="relative rounded-2xl bg-white/90 p-5 ring-1 ring-black/5 backdrop-blur sm:p-6"
      noValidate
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Full name
          </span>
          <input
            className={field}
            name="fullName"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            data-ph-mask
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Email
          </span>
          <input
            className={field}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            data-ph-mask
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            WhatsApp {content.role === "student" ? "(optional)" : ""}
          </span>
          <input
            className={field}
            type="tel"
            name="whatsapp"
            inputMode="tel"
            required={content.role === "landlord"}
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            data-ph-mask
          />
        </label>

        {content.role === "student" ? (
          <>
            <UniversityFields
              form={form}
              universityOptions={universityOptions}
              campusOptions={campusOptions}
              onUniversity={selectUniversity}
              onCampus={(campus) => update("campus", campus)}
              onOther={(universityOther) => update("universityOther", universityOther)}
              fieldClass={field}
              universityLabel="University"
            />

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                When do you need housing?
              </span>
              <select
                className={field}
                required
                value={form.housingTiming}
                onChange={(e) => update("housingTiming", e.target.value)}
              >
                <option value="">Select…</option>
                {HOUSING_TIMINGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                Area / city of the property
              </span>
              <input
                className={field}
                required
                value={form.areaCity}
                onChange={(e) => update("areaCity", e.target.value)}
                placeholder="e.g. Hamra, Jounieh, Tripoli"
                data-ph-mask
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-muted">
                Number of units
              </span>
              <select
                className={field}
                required
                value={form.unitCount}
                onChange={(e) => update("unitCount", e.target.value)}
              >
                <option value="">Select…</option>
                {UNIT_COUNTS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <UniversityFields
              form={form}
              universityOptions={universityOptions}
              campusOptions={campusOptions}
              onUniversity={selectUniversity}
              onCampus={(campus) => update("campus", campus)}
              onOther={(universityOther) => update("universityOther", universityOther)}
              fieldClass={field}
              universityLabel="Nearest university (optional)"
            />
          </>
        )}

        <label className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-black/20 text-brand focus:ring-brand"
            checked={form.betaTester}
            onChange={(e) => update("betaTester", e.target.checked)}
          />
          <span className="text-sm text-ink-muted">{content.checkboxLabel}</span>
        </label>

        {/* Honeypot */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white transition hover:bg-brand-pressed disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Joining…" : content.formCta}
      </button>
    </form>
  );
}

function UniversityFields({
  form,
  universityOptions,
  campusOptions,
  onUniversity,
  onCampus,
  onOther,
  fieldClass,
  universityLabel,
}: {
  form: FormState;
  universityOptions: { value: string; label: string }[];
  campusOptions: { value: string; label: string }[];
  onUniversity: (value: string) => void;
  onCampus: (value: string) => void;
  onOther: (value: string) => void;
  fieldClass: string;
  universityLabel: string;
}) {
  return (
    <>
      <div className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">
          {universityLabel}
        </span>
        <SearchSelect
          ariaLabel={universityLabel}
          searchPlaceholder="Search universities"
          value={form.university}
          options={universityOptions}
          onChange={onUniversity}
        />
      </div>
      {form.university === OTHER_UNIVERSITY ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            University name
          </span>
          <input
            className={fieldClass}
            required
            value={form.universityOther}
            onChange={(event) => onOther(event.target.value)}
            placeholder="Your university"
            data-ph-mask
          />
        </label>
      ) : null}
      {campusOptions.length > 0 ? (
        <div className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">
            Campus
          </span>
          <SearchSelect
            ariaLabel="Campus"
            searchPlaceholder="Search campuses"
            value={form.campus}
            options={campusOptions}
            onChange={onCampus}
          />
        </div>
      ) : null}
    </>
  );
}
