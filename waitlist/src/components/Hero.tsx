import Image from "next/image";
import Link from "next/link";
import type { PageContent } from "@/lib/content";
import { PhoneMockup } from "./PhoneMockup";
import { SignupForm } from "./SignupForm";

type HeroProps = {
  content: PageContent;
};

export function Hero({ content }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4 animate-rise">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/brand/studently-full-color.svg"
              alt="Studently"
              width={40}
              height={40}
              priority
              className="h-9 w-9 sm:h-10 sm:w-10"
            />
            <span className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Studently
            </span>
          </Link>
          <Link
            href={content.altRoleHref}
            className="max-w-[12rem] text-right text-xs font-medium text-brand underline-offset-4 transition hover:underline sm:max-w-none sm:text-sm"
          >
            {content.altRoleLabel}
          </Link>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="order-1">
            <h1 className="font-display animate-rise text-5xl font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {content.headline}
            </h1>
            <p className="animate-rise-delay-1 mt-4 max-w-md text-lg leading-relaxed text-ink-muted text-balance sm:text-xl">
              {content.valueSentence}
            </p>
          </div>

          <div className="order-2 animate-rise-delay-1 relative flex justify-center lg:order-2 lg:row-span-2 lg:justify-end lg:pt-4">
            <div
              aria-hidden
              className="absolute inset-x-8 top-1/2 h-64 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl"
            />
            <PhoneMockup
              src={content.heroScreenshot}
              alt={`${content.role === "student" ? "Student" : "Landlord"} app preview`}
              priority
            />
          </div>

          <div className="order-3 animate-rise-delay-2 max-w-md lg:order-1">
            <SignupForm content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}
