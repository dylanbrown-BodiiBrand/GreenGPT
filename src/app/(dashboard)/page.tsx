import type { Metadata } from "next";
import HomeLanding from "@/app/components/marketing/HomeLanding";

export const metadata: Metadata = {
  title: "Managed EHS Compliance for Industrial Facilities",
  description:
    "GreenGPT Advisory builds facility-specific compliance calendars, obligation registers, and audit-ready workflows for manufacturers without large in-house EHS teams.",
};

export default function HomePage() {
  return <HomeLanding />;
}
