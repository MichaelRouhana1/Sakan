import Image from "next/image";
import { ABOUT } from "@/lib/content";

export function About() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[200px_1fr] md:gap-14">
        <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full ring-4 ring-brand-mist sm:h-48 sm:w-48 md:mx-0 md:h-52 md:w-52">
          <Image
            src={ABOUT.photo}
            alt={ABOUT.name}
            fill
            className="object-cover"
            sizes="208px"
            unoptimized={ABOUT.photo.endsWith(".svg")}
          />
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
            About the builder
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {ABOUT.name}
          </h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-muted sm:text-base">
            {ABOUT.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
