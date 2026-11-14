import type { Metadata } from "next";
import { Figtree, Outfit } from "next/font/google";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studently — Find your dorm in Lebanon",
    template: "%s · Studently",
  },
  description:
    "Studently helps Lebanese students find dorms near campus and get student perks. Join the waitlist.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "Studently",
    description:
      "Find your dorm in Lebanon, and get student discounts around campus.",
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${figtree.variable} antialiased`}>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
