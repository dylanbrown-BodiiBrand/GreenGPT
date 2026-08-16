import type { Metadata } from "next";
import ManagedComplianceIntakeForm from "@/app/components/managed-compliance/ManagedComplianceIntakeForm";

export const metadata: Metadata = {
  title: "Facility Compliance Diagnostic",
  description:
    "Request a Facility Compliance Diagnostic — light web intake for scoping. The ARDR matrix is the paid diagnostic worksheet; the Managed Workspace holds live status, evidence, and CAPs.",
};

export default function IntakePage() {
  return <ManagedComplianceIntakeForm />;
}
