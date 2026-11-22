"use client";

import { useRef, useState } from "react";
import { PhoneMockup } from "./PhoneMockup";

type ScreenshotGalleryProps = {
  images: string[];
  roleLabel: string;
};

export function ScreenshotGallery({ images, roleLabel }: ScreenshotGalleryProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!images.length) return null;

  function slideDistance() {
    const root = scroller.current;
    const slide = root?.querySelector<HTMLElement>("[data-slide]");
    if (!slide) return 1;
    return slide.offsetWidth + 24;
  }

  function scrollToIndex(next: number) {
    const root = scroller.current;
    if (!root) return;
    const clamped = Math.min(Math.max(next, 0), images.length - 1);
    root.scrollTo({ left: clamped * slideDistance(), behavior: "smooth" });
  }

  function onScroll() {
    const root = scroller.current;
    if (!root) return;
    const next = Math.round(root.scrollLeft / slideDistance());
    setIndex(Math.min(Math.max(next, 0), images.length - 1));
  }

  const atStart = index === 0;
  const atEnd = index === images.length - 1;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-center">
          A peek inside
        </h2>
        <p className="mt-2 max-w-md text-ink-muted lg:mx-auto lg:text-center">
          A few {roleLabel.toLowerCase()} screens from the app.
        </p>

        <div className="mt-8 hidden w-full justify-center gap-4 lg:flex">
          {images.map((src, i) => (
            <PhoneMockup
              key={src}
              src={src}
              alt={`${roleLabel} screenshot ${i + 1}`}
              className="!mx-0 !w-[180px]"
            />
          ))}
        </div>

        <div
          ref={scroller}
          onScroll={onScroll}
          className="-mx-4 mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <div key={src} data-slide className="snap-start shrink-0">
              <PhoneMockup src={src} alt={`${roleLabel} screenshot ${i + 1}`} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
          <ArrowButton
            label="Previous screenshots"
            disabled={atStart}
            onClick={() => scrollToIndex(index - 1)}
          >
            ←
          </ArrowButton>
          <div className="flex items-center">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Show screenshot ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => scrollToIndex(i)}
                className="flex h-8 w-6 items-center justify-center"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-brand" : "bg-black/20"}`}
                />
              </button>
            ))}
          </div>
          <ArrowButton
            label="Next screenshots"
            disabled={atEnd}
            onClick={() => scrollToIndex(index + 1)}
          >
            →
          </ArrowButton>
        </div>

      </div>
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
