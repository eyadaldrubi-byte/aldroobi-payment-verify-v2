import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";

export const metadata: Metadata = {
  title: "Verify · Aldroubi",
  description:
    "Verify Ethiopian bank and wallet receipts before handing over goods. Free, no signup, no API key.",
  robots: { index: false, follow: false },
};

export default function AldroobiPage() {
  return <HomePage />;
}
