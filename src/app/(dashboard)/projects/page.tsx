// src/app/projects/page.tsx
import PageWrapper from "../../components/PageWrapper";

export default function ProjectsPage() {
  return (
    // Render our own H1 to control alignment & styling
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        {/* H1 + Intro */}
        <div className="space-y-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Projects
            </span>
          </h1>
          <p className=" text-lg leading-relaxed text-slate-700">
            Explore active initiatives and recent engagements. We share deliverables, approach,
            and outcomes to demonstrate how we drive safety, sustainability, and executive clarity.
          </p>
        </div>

        <hr className="border-t border-emerald-200/70" />

        {/* Current Project */}
        <ProjectCard
          badge="Current Project"
          title="HSE Consulting Deliverables"
          subtitle="Comprehensive health, safety, and environmental oversight during construction and commissioning."
          sections={[
            {
              number: "1",
              title: "HSE Planning & Compliance",
              bullets: [
                "Development and review of site-specific HSE plans and subcontractor safety qualifications",
                "Regulatory compliance assurance across OSHA, NFPA, and high-voltage electrical safety standards",
                "Creation and management of required HSE records and reports for client and regulatory bodies",
              ],
            },
            {
              number: "2",
              title: "Risk Management & Controls",
              bullets: [
                "Risk assessments, JHA/JSA, ALARP reviews, and hazard analysis to minimize occupational hazards",
                "Implementation of risk control measures and safe systems of work for high-voltage environments",
                "Ongoing incident trend analysis with proactive recommendations to prevent recurrence",
              ],
            },
            {
              number: "3",
              title: "Onsite HSE Leadership",
              bullets: [
                "Point-of-contact leadership between subcontractors, client, and project team for all HSE matters",
                "Site inspections and audits to verify HSE compliance and close execution gaps",
                "Direct support in embedding HSE best practices and continuous improvement initiatives",
              ],
            },
            {
              number: "4",
              title: "Training & Workforce Engagement",
              bullets: [
                "HSE onboarding and toolbox talks tailored to site-specific risks",
                "Leadership and workforce training on safety culture, Life Saving Rules, and ESG principles",
                "Coaching and support to ensure management and employees achieve HSE objectives",
              ],
            },
            {
              number: "5",
              title: "Incident Response & Investigation",
              bullets: [
                "Accident and near-miss investigations with full root-cause analysis",
                "Development and implementation of corrective and preventive actions",
                "Continuous improvement feedback loop to strengthen site-wide safety culture",
              ],
            },
            {
              number: "6",
              title: "Executive Reporting & Client Representation",
              bullets: [
                "Routine HSE progress reports presented to client stakeholders",
                "Representation in client and consultant meetings on all HSE matters",
                "Strategic alignment of HSE activities with corporate values, sustainability, and ESG commitments",
              ],
            },
          ]}
          outcome="A safer site, reduced risk exposure, compliance certainty, and a world-class safety culture that protects people and projects."
        />

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base sm:text-lg leading-relaxed text-slate-800">
              Have a project that needs HSE leadership or sustainability alignment?
            </p>
            <a
              href="https://cal.com/the-green-executive-briefing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
            >
              Book a Call
            </a>
          </div>
        </section>
      </section>
    </PageWrapper>
  );
}

/** Reusable Project card (emerald theme) */
function ProjectCard({
  badge,
  title,
  subtitle,
  sections,
  outcome,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  sections: { number: string; title: string; bullets: string[] }[];
  outcome: string;
}) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200 sm:p-8">
      <header className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {badge}
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold leading-tight text-slate-900">{title}</h2>
        {subtitle ? (
          <p className=" leading-relaxed text-slate-700">{subtitle}</p>
        ) : null}
      </header>

      <div className="space-y-8">
        {sections.map(({ number, title, bullets }) => (
          <section key={title} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 select-none items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
                {number}
              </span>
              <h3 className="text-xl font-semibold leading-tight text-slate-900">{title}</h3>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  {/* Emerald check icon */}
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="leading-relaxed text-slate-800">{b}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <p className="text-sm sm:text-base text-emerald-900/90">
          <span className="font-semibold text-emerald-900">Outcome:</span> {outcome}
        </p>
      </div>
    </article>
  );
}
