import type { WaitlistRole } from "./constants";

export type Benefit = {
  title: string;
  description: string;
  icon: "shield" | "map" | "gift" | "users" | "spark" | "inbox";
};

export type PageContent = {
  role: WaitlistRole;
  altRoleHref: string;
  altRoleLabel: string;
  headline: string;
  valueSentence: string;
  formCta: string;
  checkboxLabel: string;
  screenshotDir: "/screenshots/students" | "/screenshots/landlords";
  demoVideoPath: "/demo-students.mp4" | "/demo-landlords.mp4";
  demoPosterPath: string;
  youtubeFallbackUrl?: string;
  benefits: Benefit[];
  socialProofLabel: string;
  heroScreenshot: string;
};

export const STUDENT_CONTENT: PageContent = {
  role: "student",
  altRoleHref: "/landlords",
  altRoleLabel: "Are you a landlord? List your units",
  headline: "Find your dorm in Lebanon.",
  valueSentence: "Get student discounts around campus.",
  formCta: "Join the waitlist",
  checkboxLabel: "I want to be a beta tester",
  screenshotDir: "/screenshots/students",
  demoVideoPath: "/demo-students.mp4",
  demoPosterPath: "/screenshots/students/screen-1.svg",
  benefits: [
    {
      title: "Verified dorms",
      description: "Listings checked so you know what you’re walking into.",
      icon: "shield",
    },
    {
      title: "Near your university",
      description: "Search by campus — AUB, LAU, USJ, and more.",
      icon: "map",
    },
    {
      title: "Exclusive student perks",
      description: "Discounts and deals near campus, just for students.",
      icon: "gift",
    },
  ],
  socialProofLabel: "students already joined",
  heroScreenshot: "/screenshots/students/screen-1.svg",
};

export const LANDLORD_CONTENT: PageContent = {
  role: "landlord",
  altRoleHref: "/",
  altRoleLabel: "Looking for a dorm? Join as a student",
  headline: "Fill your units with students.",
  valueSentence: "Without the hassle.",
  formCta: "Join as a landlord",
  checkboxLabel: "I want early access to list my units",
  screenshotDir: "/screenshots/landlords",
  demoVideoPath: "/demo-landlords.mp4",
  demoPosterPath: "/screenshots/landlords/screen-1.svg",
  benefits: [
    {
      title: "Reach students directly",
      description: "Show up where Lebanese students already look for housing.",
      icon: "users",
    },
    {
      title: "Free to list during beta",
      description: "Get in early — listing is free while we launch.",
      icon: "spark",
    },
    {
      title: "Manage inquiries in one place",
      description: "Keep WhatsApp chats and interest organized, not scattered.",
      icon: "inbox",
    },
  ],
  socialProofLabel: "landlords already joined",
  heroScreenshot: "/screenshots/landlords/screen-1.svg",
};

/** Real quotes only. Leave empty to hide the testimonials section. */
export const TESTIMONIALS: Array<{
  quote: string;
  name: string;
  detail: string;
  role: WaitlistRole;
}> = [];

export const ABOUT = {
  name: "Tony & Michael",
  photo: "/founder-placeholder.svg",
  /** Swap to /founder.jpg when you add a real photo in public/ */
  paragraphs: [
    "We’re building Studently because finding a dorm in Lebanon shouldn’t mean endless WhatsApp groups, unclear photos, and last-minute stress before the semester.",
    "As students, we watched friends waste weeks hunting for a place near campus, while landlords struggled to reach the right people. Studently connects both sides in one simple app.",
    "Join the waitlist and help us shape the first version for Lebanese universities.",
  ],
};
