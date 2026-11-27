import { Suspense } from "react";
import { WaitlistPage } from "@/components/WaitlistPage";
import { STUDENT_CONTENT } from "@/lib/content";

export default function StudentWaitlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen atmosphere" />}>
      <WaitlistPage content={STUDENT_CONTENT} />
    </Suspense>
  );
}
