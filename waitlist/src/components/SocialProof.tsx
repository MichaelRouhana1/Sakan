"use client";

import { useEffect, useState } from "react";
import type { WaitlistRole } from "@/lib/constants";
import { TESTIMONIALS } from "@/lib/content";

type SocialProofProps = {
  role: WaitlistRole;
  label: string;
};

export function SocialProof({ role, label }: SocialProofProps) {
  const [count, setCount] = useState<number | null>(null);
  const quotes = TESTIMONIALS.filter((t) => t.role === role);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/waitlist/count?role=${role}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCount(typeof data.count === "number" ? data.count : 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {count === null ? (
              <span className="inline-block h-10 w-24 animate-pulse rounded-lg bg-black/10" />
            ) : (
              <span className="text-brand">{count.toLocaleString()}</span>
            )}{" "}
            <span className="text-ink">{label}</span>
          </p>
        </div>

        {quotes.length > 0 ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((q) => (
              <blockquote key={q.name + q.quote.slice(0, 12)}>
                <p className="text-lg leading-relaxed text-ink">“{q.quote}”</p>
                <footer className="mt-3 text-sm text-ink-muted">
                  <span className="font-medium text-ink">{q.name}</span>
                  {" · "}
                  {q.detail}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
