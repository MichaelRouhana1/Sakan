import type { Metadata } from "next";
import { Suspense } from "react";
import { WaitlistPage } from "@/components/WaitlistPage";
import { LANDLORD_CONTENT } from "@/lib/content";

export const metadata: Metadata = {
  title: "For landlords",
  description:
    "Fill your units with students, without the hassle. Join the Studently landlord waitlist.",
};

export default function LandlordWaitlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen atmosphere" />}>
      <WaitlistPage content={LANDLORD_CONTENT} />
    </Suspense>
  );
}
