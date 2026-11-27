import type { PageContent } from "@/lib/content";
import { listScreenshotPlaceholders, publicFileExists } from "@/lib/media";
import { About } from "./About";
import { Benefits } from "./Benefits";
import { DemoVideo } from "./DemoVideo";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { ScreenshotGallery } from "./ScreenshotGallery";
import { SocialProof } from "./SocialProof";

type WaitlistPageProps = {
  content: PageContent;
};

export function WaitlistPage({ content }: WaitlistPageProps) {
  const screenshots = listScreenshotPlaceholders(content.screenshotDir);
  const videoExists = publicFileExists(content.demoVideoPath);

  return (
    <div className="atmosphere relative min-h-screen">
      <div className="grain absolute inset-0" aria-hidden />
      <div className="relative">
        <Hero content={content} />
        <ScreenshotGallery
          images={screenshots}
          roleLabel={content.role === "student" ? "Student" : "Landlord"}
        />
        <DemoVideo
          src={content.demoVideoPath}
          poster={content.demoPosterPath}
          youtubeUrl={content.youtubeFallbackUrl}
          exists={videoExists}
        />
        <Benefits items={content.benefits} />
        <SocialProof role={content.role} label={content.socialProofLabel} />
        <About />
        <Footer />
      </div>
    </div>
  );
}
