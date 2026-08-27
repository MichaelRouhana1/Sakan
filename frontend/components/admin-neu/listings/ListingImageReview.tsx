import { ChevronLeft, ChevronRight, Flag } from "lucide-react-native";
import { useEffect, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuIconButton, NeuSurface } from "../NeuPrimitives";
import type { AdminListing } from "./types";

type Props = {
  listing: AdminListing;
  canModerate: boolean;
  busy?: boolean;
  onTogglePhotoFlag: (photoId: string, flagged: boolean) => void;
};

export function ListingImageReview({
  listing,
  canModerate,
  busy,
  onTogglePhotoFlag,
}: Props) {
  const [index, setIndex] = useState(0);
  const photos = listing.photos;
  const current = photos[index] ?? photos[0];

  useEffect(() => {
    setIndex(0);
  }, [listing.id]);

  useEffect(() => {
    if (photos.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length]);

  if (!current) {
    return (
      <NeuSurface inset className="px-4 py-10 text-center text-sm text-clay-700">
        No photos on this listing.
      </NeuSurface>
    );
  }

  return (
    <H>
      <H className="mb-3 flex items-baseline justify-between gap-3">
        <H as="h3" className="font-display text-sm font-semibold">
          Image review
        </H>
        <H as="p" className="text-[11px] font-medium text-clay-500">
          {index + 1} / {photos.length}
          {current.flagged ? " · Flagged" : ""}
        </H>
      </H>

      <NeuSurface inset className="overflow-hidden p-2">
        <H
          as="img"
          src={current.url}
          alt={`${listing.title}, ${current.caption}`}
          className={[
            "h-52 w-full rounded-neu-md object-cover sm:h-64",
            current.flagged ? "opacity-80 ring-2 ring-ember" : "",
          ].join(" ")}
        />
      </NeuSurface>

      <H className="mt-2 flex items-start justify-between gap-3">
        <H as="p" className="text-sm text-clay-700">
          {current.caption}
        </H>
        {canModerate ? (
          <NeuButton
            tone={current.flagged ? "moss" : "ember"}
            disabled={busy}
            className="shrink-0 px-2.5 py-1.5 text-xs"
            onClick={() => onTogglePhotoFlag(current.id, !current.flagged)}
          >
            <Flag size={14} strokeWidth={1.75} />
            {current.flagged ? "Clear flag" : "Flag photo"}
          </NeuButton>
        ) : null}
      </H>

      <H className="mt-3 flex items-center gap-2">
        <NeuIconButton
          ariaLabel="Previous photo"
          disabled={photos.length < 2}
          onClick={() =>
            setIndex((i) => (i === 0 ? photos.length - 1 : i - 1))
          }
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </NeuIconButton>

        <H className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
          {photos.map((photo, photoIndex) => {
            const selected = photoIndex === index;
            return (
              <H
                as="button"
                type="button"
                key={photo.id}
                aria-label={`Show photo ${photoIndex + 1}: ${photo.caption}`}
                aria-current={selected ? "true" : undefined}
                onClick={() => setIndex(photoIndex)}
                className={[
                  "relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-neu-md bg-clay-100 p-0.5 transition-shadow duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  selected ? "shadow-press" : "shadow-neu-sm",
                ].join(" ")}
              >
                <H
                  as="img"
                  src={photo.url}
                  alt=""
                  className="h-full w-full rounded-[10px] object-cover"
                  loading="lazy"
                />
                {photo.flagged ? (
                  <H
                    as="span"
                    className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ember"
                    aria-hidden
                  />
                ) : null}
              </H>
            );
          })}
        </H>

        <NeuIconButton
          ariaLabel="Next photo"
          disabled={photos.length < 2}
          onClick={() =>
            setIndex((i) => (i === photos.length - 1 ? 0 : i + 1))
          }
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </NeuIconButton>
      </H>
    </H>
  );
}
