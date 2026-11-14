"use client";

import { useRef } from "react";
import { PhoneMockup } from "./PhoneMockup";

type ScreenshotGalleryProps = {
  images: string[];
  roleLabel: string;
};

export function ScreenshotGallery({ images, roleLabel }: ScreenshotGalleryProps) {
  const scroller = useRef<HTMLDivElement>(null);

  if (!images.length) return null;

  function scrollBy(dir: number) {
    scroller.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  }

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              A peek inside
            </h2>
            <p className="mt-2 max-w-md text-ink-muted">
              A few {roleLabel.toLowerCase()} screens from the app.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              aria-label="Previous screenshots"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-ink"
              aria-label="Next screenshots"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={scroller}
          className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <div key={src} className="snap-center shrink-0 first:pl-1 last:pr-1">
              <PhoneMockup src={src} alt={`${roleLabel} screenshot ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
