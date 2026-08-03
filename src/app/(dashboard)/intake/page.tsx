import type { Metadata } from "next";
import ManagedComplianceIntakeForm from "@/app/components/managed-compliance/ManagedComplianceIntakeForm";

export const metadata: Metadata = {
  title: "Facility Compliance Diagnostic",
  description:
    "Request a Facility Compliance Diagnostic from GreenGPT Advisory — facility scoping for obligation registers, calendars, and managed EHS follow-through.",
};

export default function IntakePage() {
  return <ManagedComplianceIntakeForm />;
}
