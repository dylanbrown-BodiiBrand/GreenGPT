import type { Metadata } from "next";
import EHSCalendarLanding from "@/app/components/ehs-calendar/EHSCalendarLanding";

export const metadata: Metadata = {
  title: "Home | The Green Executive Briefing",
  description:
    "Generate a personalized EHS compliance calendar from your industry, jurisdiction, and facility profile.",
};

export default function HomePage() {
  return <EHSCalendarLanding />;
}
