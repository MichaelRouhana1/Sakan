import Image from "next/image";
import Link from "next/link";
import type { PageContent } from "@/lib/content";
import { HeroCount } from "./HeroCount";
import { PhoneMockup } from "./PhoneMockup";
import { SignupForm } from "./SignupForm";

type HeroProps = {
  content: PageContent;
};

export function Hero({ content }: HeroProps) {
  return (
    <section id="top" className="relative overflow-x-clip px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center justify-between gap-4 lg:mb-6">
          <Link href="#top" className="inline-flex shrink-0 items-center gap-2">
            <Image
              src="/brand/studently-full-color.svg"
              alt=""
              width={40}
              height={40}
              priority
              unoptimized
              className="h-9 w-9 lg:h-10 lg:w-10"
            />
            <span className="font-display text-xl font-bold leading-none tracking-tight text-ink lg:text-2xl">
              Studently
            </span>
          </Link>
          <Link
            href={content.altRoleHref}
            className="max-w-[11rem] text-right text-xs font-medium leading-snug text-brand underline-offset-4 transition hover:underline sm:max-w-none sm:text-sm"
          >
            {content.altRoleLabel}
          </Link>
        </div>

        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(300px,360px)] lg:gap-8">
          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink lg:text-5xl">
              {content.headline}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              {content.valueSentence}
            </p>
            <ul className="mt-4 space-y-2">
              {content.benefits.map((benefit) => (
                <li key={benefit.title} className="flex items-center gap-2 text-sm text-ink-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {benefit.title}
                </li>
              ))}
            </ul>
            <HeroCount role={content.role} />
          </div>

          <div className="relative flex justify-center">
            <div
              aria-hidden
              className="absolute inset-x-6 top-1/2 h-48 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl lg:h-64"
            />
            <PhoneMockup
              variant="hero"
              src={content.heroScreenshot}
              alt={`${content.role === "student" ? "Student" : "Landlord"} app preview`}
              priority
            />
          </div>
          <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-stretch">
            <SignupForm content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}
