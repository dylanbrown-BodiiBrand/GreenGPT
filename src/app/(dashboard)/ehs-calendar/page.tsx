import type { Metadata } from "next";
import EHSCalendarGenerator from "@/app/components/ehs-calendar/EHSCalendarGenerator";

export const metadata: Metadata = {
  title: "EHS Compliance Calendar | The Green Executive Briefing",
  description:
    "Generate a personalized EHS compliance calendar based on your industry, jurisdiction, and facility hazard profile.",
};

export default function EHSCalendarPage() {
  return <EHSCalendarGenerator />;
}
