import Link from "next/link";
import { BRAND } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            {BRAND.name}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            We only use your details to invite you to Studently and related
            product updates. No spam, no selling your data.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="font-medium text-ink hover:text-brand"
          >
            {BRAND.contactEmail}
          </a>
          <a
            href={BRAND.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink hover:text-brand"
          >
            Instagram
          </a>
          <Link href="/landlords" className="text-ink-muted hover:text-brand">
            For landlords
          </Link>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-ink-faint">
        © {year} Studently. Built in Lebanon.
      </p>
    </footer>
  );
}
