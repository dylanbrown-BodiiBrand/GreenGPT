import type { Metadata } from "next";
import Link from "next/link";
import PageWrapper from "../../components/PageWrapper";

export const metadata: Metadata = {
  title: "About",
  description:
    "GreenGPT Advisory builds managed EHS compliance systems for industrial facilities — led by an experienced EHS professional.",
};

const CAL_URL = "https://cal.com/the-green-executive-briefing";

export default function AboutPage() {
  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-3xl space-y-8 text-left">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">About</p>
          <h1 className="text-3xl font-bold text-[#0B3D2E] sm:text-4xl">GreenGPT Advisory</h1>
          <p className="text-lg leading-relaxed text-slate-700">
            Managed EHS compliance systems for industrial facilities.
          </p>
        </div>

        <div className="space-y-4 text-base leading-relaxed text-slate-700">
          <p>
            Mid-size manufacturers often have the expertise — but not the operating system — to keep obligations,
            evidence, and corrective actions current across facilities. Work ends up in spreadsheets, email threads,
            SharePoint folders, and individual knowledge.
          </p>
          <p>
            GreenGPT Advisory is led by Dylan Brown, an experienced EHS professional. The company builds and helps
            maintain facility-specific compliance calendars, obligation registers, and audit-ready workflows. Software
            is the delivery infrastructure; professional judgment governs applicability and approval.
          </p>
          <p>
            GreenGPT assists qualified EHS professionals. It does not replace them. Outputs remain drafts until
            reviewed and approved. Answers should be grounded in client-approved sources. This is not legal advice.
            Your organization remains the final decision owner.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          The Green Executive Briefing is our content series / newsletter name. The company and product identity is
          GreenGPT Advisory.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-xl bg-[#0B3D2E] px-5 py-3 text-base font-semibold text-white hover:bg-[#0a3326]"
          >
            Request a Diagnostic
          </Link>
          <a
            href={CAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#0B3D2E] px-5 py-3 text-base font-semibold text-[#0B3D2E] hover:bg-[#F5F5F0]"
          >
            Book a Call
          </a>
        </div>
      </section>
    </PageWrapper>
  );
}
