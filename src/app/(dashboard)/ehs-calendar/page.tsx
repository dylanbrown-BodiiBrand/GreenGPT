import type { Metadata } from "next";
import EHSCalendarLanding from "@/app/components/ehs-calendar/EHSCalendarLanding";

export const metadata: Metadata = {
  title: "EHS Compliance Calendar Tool",
  description:
    "Generate a preliminary facility-specific EHS compliance calendar from your industry, jurisdiction, and hazard profile. Final applicability requires human review.",
};

export default function EHSCalendarPage() {
  return <EHSCalendarLanding />;
}
