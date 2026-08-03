import Link from "next/link";
import PageWrapper from "../../components/PageWrapper";

const CAL_URL = "https://cal.com/the-green-executive-briefing";

const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-[#0B3D2E] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#0a3326] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2";

const outlineBtn =
  "inline-flex items-center justify-center rounded-xl border-2 border-[#0B3D2E] bg-white px-5 py-3 text-base font-semibold text-[#0B3D2E] shadow-sm transition hover:bg-[#F5F5F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2";

export default function ServicesPage() {
  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Solutions</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#0B3D2E] sm:text-4xl">
            Managed EHS compliance systems for industrial facilities
          </h1>
          <p className="text-lg leading-relaxed text-slate-700">
            GreenGPT Advisory helps manufacturers without large in-house EHS teams keep obligations, deadlines,
            evidence, and corrective actions organized — with human review on every material output.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/intake" className={primaryBtn}>
              Request a Diagnostic
            </Link>
            <a href={CAL_URL} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
              Book a Call
            </a>
          </div>
        </div>

        <hr className="border-t border-emerald-200/70" />

        <div className="grid gap-8">
          <OfferCard
            number="1"
            title="Facility Compliance Diagnostic"
            price="Starting at $750 per facility (final pricing based on complexity)"
            lead="A paid entry engagement that scopes your facility and produces a usable first register and calendar."
            bullets={[
              "Facility applicability questionnaire",
              "Preliminary federal and state obligation register",
              "Twelve-month compliance calendar",
              "Top potential compliance gaps",
              "Findings review call",
              "Recommended implementation plan",
            ]}
            cta={{ href: "/intake", label: "Request a Diagnostic" }}
          />

          <OfferCard
            number="2"
            title="Managed EHS Compliance"
            price="Generally $750–$2,000 per facility per month (scope-based)"
            lead="Ongoing operating rhythm: maintained registers, deadline monitoring, corrective-action follow-up, and monthly briefings."
            bullets={[
              "Maintained obligation register",
              "Calendar and deadline monitoring",
              "Permit and reporting tracker",
              "Draft inspection and reporting materials",
              "Corrective-action tracking",
              "Monthly compliance briefing",
              "Quarterly program review",
              "Human EHS review",
            ]}
            cta={{ href: "/intake", label: "Discuss Your Facility" }}
          />

          <OfferCard
            number="3"
            title="Custom EHS AI Workspace"
            price="Configured workspace with scope-based setup and ongoing support"
            lead="A client-visible workspace built on your approved documents — drafts only, reviewed by your EHS team before use."
            bullets={[
              "Client-approved document library",
              "Site-aware, source-grounded assistant",
              "Inspection and audit workflows",
              "Corrective-action workflows",
              "Facility-specific procedures and forms support",
              "User training",
              "Periodic source and configuration review",
            ]}
            cta={{ href: "#pilot", label: "Explore a 30-Day Pilot" }}
          />
        </div>

        <section id="pilot" className="scroll-mt-24 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[#0B3D2E]">30-day redacted pilot</h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            Scope one to three sites or one selected workflow. Redacted documents are welcome. Inputs, deliverables,
            and end date are defined up front — no automatic ongoing obligation.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Suggested deliverables</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                <li>Searchable EHS knowledge workspace (pilot preview)</li>
                <li>10–15 validated example prompts</li>
                <li>Sample corrective-action tracker</li>
                <li>Sample inspection preparation checklist</li>
                <li>Sample monthly compliance briefing</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Success criteria (agreed together)</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                <li>Reduced document-search time</li>
                <li>Faster conversion of findings into assigned actions</li>
                <li>Clearer evidence requirements</li>
                <li>More consistent outputs across sites</li>
              </ul>
              <p className="mt-3 text-xs text-slate-600">
                We do not promise quantified savings unless measured during the engagement.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/intake" className={primaryBtn}>
              Start with a Diagnostic
            </Link>
            <Link href="/briefing/demo" className={outlineBtn}>
              View Sample Briefing
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Additional advisory capabilities</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Secondary capabilities available only when relevant to an engagement — they are not the primary offer.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>ISO 14001 EMS support</li>
            <li>Facility EHS program assessments</li>
            <li>Training and procedure development support</li>
            <li>Targeted sustainability or GHG work when scoped separately</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base sm:text-lg leading-relaxed text-slate-800">
              Ready to scope a facility? Start with a diagnostic intake or book a call.
            </p>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/intake" className={primaryBtn}>
                Request a Diagnostic
              </Link>
              <a href={CAL_URL} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                Book a Call
              </a>
            </div>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          GreenGPT assists qualified EHS professionals and does not replace them. Outputs remain drafts until reviewed
          and approved. Not legal advice. Your organization remains the final decision owner. We do not claim dedicated
          instances, formal enterprise RBAC, or complete audit trails unless those controls are explicitly configured
          for your engagement.
        </p>
      </section>
    </PageWrapper>
  );
}

function OfferCard({
  number,
  title,
  price,
  lead,
  bullets,
  cta,
}: {
  number: string;
  title: string;
  price: string;
  lead: string;
  bullets: string[];
  cta: { href: string; label: string };
}) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
          {number}
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight text-slate-900">{title}</h2>
      </header>
      <p className="mb-2 text-sm font-semibold text-[#0B3D2E]">{price}</p>
      <p className="mb-4 leading-relaxed text-slate-700">{lead}</p>
      <ul className="mb-5 grid gap-3 sm:grid-cols-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            >
              <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="leading-relaxed text-slate-800">{b}</span>
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={primaryBtn}>
        {cta.label}
      </Link>
    </section>
  );
}
