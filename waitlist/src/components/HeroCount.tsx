"use client";

import { useEffect, useState } from "react";
import type { WaitlistRole } from "@/lib/constants";

type HeroCountProps = {
  role: WaitlistRole;
};

export function HeroCount({ role }: HeroCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const noun = role === "student" ? "students" : "landlords";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/waitlist/count?role=${role}`)
      .then((response) => response.json())
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
    <p className="mt-4 text-sm font-medium text-ink">
      {count === null ? (
        <span className="inline-block h-4 w-40 animate-pulse rounded bg-black/10" />
      ) : (
        <>
          Join <span className="text-brand">{count.toLocaleString()}</span> {noun}{" "}
          already on the list
        </>
      )}
    </p>
  );
}
