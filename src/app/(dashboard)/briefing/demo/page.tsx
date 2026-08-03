import type { Metadata } from "next";
import MonthlyComplianceBriefing from "@/app/components/managed-compliance/MonthlyComplianceBriefing";
import { SAMPLE_BRIEFING } from "@/lib/managed-compliance/sampleBriefing";

export const metadata: Metadata = {
  title: "Sample Monthly Compliance Briefing",
  description:
    "Representative sample of the monthly compliance briefing GreenGPT Advisory prepares for managed EHS clients. Sample data only.",
};

export default function BriefingDemoPage() {
  return (
    <div>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-950">
        <strong>Representative sample.</strong> Facility names, scores, and items below are illustrative — not a live
        client record. Draft outputs require EHS review before use.
      </div>
      <MonthlyComplianceBriefing data={SAMPLE_BRIEFING} />
    </div>
  );
}
