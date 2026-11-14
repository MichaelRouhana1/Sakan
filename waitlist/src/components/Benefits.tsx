import { Gift, Inbox, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { Benefit } from "@/lib/content";

const ICONS = {
  shield: ShieldCheck,
  map: MapPin,
  gift: Gift,
  users: Users,
  spark: Sparkles,
  inbox: Inbox,
} as const;

type BenefitsProps = {
  items: Benefit[];
};

export function Benefits({ items }: BenefitsProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Why join early
        </h2>
        <ul className="mt-10 grid gap-10 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.title}>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-mist text-brand">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
