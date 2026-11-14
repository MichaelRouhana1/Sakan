type DemoVideoProps = {
  src: string;
  poster: string;
  youtubeUrl?: string;
  exists: boolean;
};

export function DemoVideo({ src, poster, youtubeUrl, exists }: DemoVideoProps) {
  if (!exists && !youtubeUrl) return null;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          See it in 30 seconds
        </h2>
        <p className="mt-2 text-ink-muted">Muted autoplay — tap for sound.</p>

        <div className="mt-8 overflow-hidden rounded-3xl bg-ink shadow-phone ring-1 ring-black/10">
          {exists ? (
            <video
              className="aspect-video w-full bg-black"
              src={src}
              poster={poster}
              muted
              autoPlay
              loop
              playsInline
              controls
            />
          ) : (
            <div className="aspect-video w-full">
              <iframe
                title="Studently demo"
                src={youtubeUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
