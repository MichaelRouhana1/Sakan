import Image from "next/image";

type PhoneMockupProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Hero phone sits beside the form; gallery phones stay larger. */
  variant?: "gallery" | "hero";
};

export function PhoneMockup({
  src,
  alt,
  className = "",
  priority = false,
  variant = "gallery",
}: PhoneMockupProps) {
  const width =
    variant === "hero"
      ? "w-[190px] sm:w-[200px] lg:w-[232px] xl:w-[252px]"
      : "w-[220px] sm:w-[260px] md:w-[280px]";

  return (
    <div className={`relative mx-auto ${width} ${className}`}>
      <div className="animate-float rounded-[2.2rem] border-[10px] border-ink bg-ink p-1 shadow-phone">
        <div className="relative overflow-hidden rounded-[1.55rem] bg-brand-mist aspect-[9/19.5]">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-top"
            sizes="280px"
            priority={priority}
            unoptimized={src.endsWith(".svg")}
          />
        </div>
      </div>
    </div>
  );
}
