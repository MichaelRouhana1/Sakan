"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CAMPUS_FILTER_OPTIONS,
  INSTITUTIONS_BY_SHORT_NAME,
} from "@/lib/universities";

type Stats = {
  total: number;
  students: number;
  landlords: number;
  betaTesters: number;
  byDay: { date: string; count: number }[];
  studentsByUniversity: { name: string; count: number }[];
  byCampus: { name: string; count: number }[];
  landlordsByArea: { name: string; count: number }[];
  landlordsByUnits: { name: string; count: number }[];
  topReferrers: { code: string; count: number; email: string | null }[];
  recent: Array<{
    id: string;
    role: string;
    fullName: string;
    email: string;
    university: string | null;
    campus: string | null;
    areaCity: string | null;
    unitCount: string | null;
    betaTester: boolean;
    referralCode: string;
    referredBy: string | null;
    createdAt: string;
  }>;
};

type Filters = {
  role: "all" | "student" | "landlord";
  from: string;
  to: string;
  university: string;
  campus: string;
  area: string;
  beta: boolean;
};

const emptyFilters: Filters = {
  role: "all",
  from: "",
  to: "",
  university: "",
  campus: "",
  area: "",
  beta: false,
};

export function AdminDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (f.role !== "all") params.set("role", f.role);
    if (f.from) params.set("from", f.from);
    if (f.to) params.set("to", f.to);
    if (f.university) params.set("university", f.university);
    if (f.campus) params.set("campus", f.campus);
    if (f.area) params.set("area", f.area);
    if (f.beta) params.set("beta", "1");

    const res = await fetch(`/api/admin/stats?${params.toString()}`);
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to load stats");
      setLoading(false);
      return;
    }
    setStats(await res.json());
    setAuthed(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats(emptyFilters);
  }, [loadStats]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password");
      return;
    }
    setPassword("");
    await loadStats(filters);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setStats(null);
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 atmosphere">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5"
        >
          <h1 className="font-display text-2xl font-semibold text-ink">
            Admin
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Enter the admin password to view waitlist analytics.
          </p>
          <input
            type="password"
            className="mt-5 w-full rounded-xl border border-black/10 px-3 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            data-ph-mask
          />
          {loginError ? (
            <p className="mt-2 text-sm text-red-600">{loginError}</p>
          ) : null}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-brand py-3 font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const exportParams = new URLSearchParams();
  if (filters.role !== "all") exportParams.set("role", filters.role);
  if (filters.university) exportParams.set("university", filters.university);
  if (filters.campus) exportParams.set("campus", filters.campus);
  const exportUrl = `/api/admin/export?${exportParams.toString()}`;
  const campusOptions = filters.university
    ? CAMPUS_FILTER_OPTIONS.filter((option) =>
        option.value.startsWith(`${filters.university}:::`),
      )
    : CAMPUS_FILTER_OPTIONS;

  return (
    <div className="min-h-screen bg-wash px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">
              Waitlist admin
            </h1>
            <p className="text-sm text-ink-muted">Studently sign-ups</p>
          </div>
          <div className="flex gap-2">
            <a
              href={exportUrl}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium"
            >
              Export CSV
            </a>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              Log out
            </button>
          </div>
        </div>

        <form
          className="mt-8 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            loadStats(filters);
          }}
        >
          <label className="text-xs text-ink-muted">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.role}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  role: e.target.value as Filters["role"],
                }))
              }
            >
              <option value="all">All</option>
              <option value="student">Students</option>
              <option value="landlord">Landlords</option>
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            From
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.from}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-ink-muted">
            To
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.to}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value }))
              }
            />
          </label>
          <label className="text-xs text-ink-muted">
            University
            <select
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.university}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  university: e.target.value,
                  campus:
                    f.campus &&
                    e.target.value &&
                    !f.campus.startsWith(`${e.target.value}:::`)
                      ? ""
                      : f.campus,
                }))
              }
            >
              <option value="">Any</option>
              {INSTITUTIONS_BY_SHORT_NAME.map((institution) => (
                <option key={institution.slug} value={institution.shortName}>
                  {institution.shortName} — {institution.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            Campus
            <select
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.campus}
              onChange={(e) =>
                setFilters((f) => ({ ...f, campus: e.target.value }))
              }
            >
              <option value="">Any</option>
              {campusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            Area contains
            <input
              className="mt-1 w-full rounded-lg border border-black/10 px-2 py-2 text-sm"
              value={filters.area}
              onChange={(e) =>
                setFilters((f) => ({ ...f, area: e.target.value }))
              }
            />
          </label>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={filters.beta}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, beta: e.target.checked }))
                }
              />
              Beta only
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : null}
        {loading && !stats ? (
          <p className="mt-8 text-ink-muted">Loading stats…</p>
        ) : null}

        {stats ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total (filtered)" value={stats.total} />
              <Stat label="Students" value={stats.students} />
              <Stat label="Landlords" value={stats.landlords} />
              <Stat label="Beta testers" value={stats.betaTesters} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Panel title="Sign-ups per day">
                <SimpleBars
                  items={stats.byDay.map((d) => ({
                    label: d.date.slice(5),
                    count: d.count,
                  }))}
                />
              </Panel>
              <Panel title="Students by university">
                <SimpleBars items={stats.studentsByUniversity} />
              </Panel>
              <Panel title="By campus">
                <SimpleBars items={stats.byCampus} />
              </Panel>
              <Panel title="Landlords by area">
                <SimpleBars items={stats.landlordsByArea} />
              </Panel>
              <Panel title="Landlords by unit count">
                <SimpleBars items={stats.landlordsByUnits} />
              </Panel>
              <Panel title="Top referrers">
                {stats.topReferrers.length === 0 ? (
                  <p className="text-sm text-ink-muted">No referrals yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {stats.topReferrers.map((r) => (
                      <li
                        key={r.code}
                        className="flex justify-between gap-3 border-b border-black/5 pb-2"
                      >
                        <span>
                          <span className="font-mono font-medium">{r.code}</span>
                          {r.email ? (
                            <span className="ml-2 text-ink-muted">{r.email}</span>
                          ) : null}
                        </span>
                        <span className="font-semibold">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Recent sign-ups" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-xs uppercase text-ink-faint">
                    <tr>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Role</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Detail</th>
                      <th className="py-2">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r) => (
                      <tr key={r.id} className="border-t border-black/5">
                        <td className="py-2 pr-3 whitespace-nowrap text-ink-muted">
                          {new Date(r.createdAt).toLocaleString("en-GB", {
                            timeZone: "Europe/London",
                          })}
                        </td>
                        <td className="py-2 pr-3">{r.role}</td>
                        <td className="py-2 pr-3">{r.fullName}</td>
                        <td className="py-2 pr-3">{r.email}</td>
                        <td className="py-2 pr-3 text-ink-muted">
                          {r.role === "student"
                            ? [r.university, r.campus].filter(Boolean).join(" · ")
                            : [r.areaCity, r.unitCount, r.university, r.campus]
                                .filter(Boolean)
                                .join(" · ")}
                        </td>
                        <td className="py-2">{r.betaTester ? "Yes" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 ring-1 ring-black/5 ${className}`}>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SimpleBars({
  items,
}: {
  items: { name?: string; label?: string; count: number }[];
}) {
  if (!items.length) {
    return <p className="text-sm text-ink-muted">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.slice(0, 12).map((item) => {
        const label = item.name ?? item.label ?? "";
        return (
          <li key={label}>
            <div className="mb-1 flex justify-between text-xs text-ink-muted">
              <span>{label}</span>
              <span>{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-brand-mist">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
