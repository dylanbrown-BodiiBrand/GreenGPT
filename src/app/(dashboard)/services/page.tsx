// src/app/services/page.tsx
import PageWrapper from "../../components/PageWrapper";

export default function ServicesPage() {
  return (
    // Render our own H1 to control alignment & styling
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        {/* H1 + Intro + CTA */}
        <div className="space-y-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Our Services
            </span>
          </h1>

          <p className=" text-lg leading-relaxed text-slate-700">
            At <strong>The Green Executive Briefing</strong>, we help businesses navigate
            sustainability with confidence by combining compliance expertise, green accounting,
            and AI-powered insights.
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

        <hr className="border-t border-emerald-200/70" />

        {/* Services Grid */}
        <div className="grid gap-8">
          <ServiceCard
            number="1"
            title="Compliance & Standards"
            lead="Stay ahead of regulations and global ESG frameworks. We ensure your business meets the highest standards of sustainability compliance."
            bullets={[
              "GHG Protocol Scope 1, 2, and 3 inventories",
              "ISO 14001 Environmental Management Systems implementation & auditing",
              "ESG disclosure alignment (CSRD, SEC Climate Rules, SASB, TCFD, GRI)",
              "Regulatory compliance tracking and risk assessments",
            ]}
            outcome="Reduced compliance risk, stronger investor confidence, and audit-ready reporting."
          />

          <ServiceCard
            number="2"
            title="Green Accounting & Insights"
            lead="Turn your carbon data into actionable strategies. Our consulting translates raw sustainability data into meaningful financial and operational insights."
            bullets={[
              "Corporate & product-level carbon footprinting",
              "Life Cycle Assessments (LCA) & Environmental Product Declarations (EPDs)",
              "Emissions intensity reporting (per revenue, unit, etc.)",
              "Decarbonization roadmaps with measurable KPIs",
            ]}
            outcome="Clear emissions baselines, cost-saving opportunities, and credible progress toward Net Zero."
          />

          <ServiceCard
            number="3"
            title="AI-Powered GreenGPT™ Tools"
            lead="Leverage the power of AI to streamline sustainability. Our proprietary GreenGPT™ platform helps you collect, analyze, and act on sustainability data faster."
            bullets={[
              "AI-assisted GHG accounting and ESG reporting",
              "Automated Scope 3 supplier data collection & verification",
              "Predictive analytics to model reduction scenarios",
              "Custom AI workflows integrated into client operations",
            ]}
            outcome="Faster reporting cycles, fewer manual errors, and smarter sustainability decisions."
          />

          <ServiceCard
            number="4"
            title="Strategic Sustainability Consulting"
            lead="Sustainability isn’t just about compliance—it’s about growth. We partner with leadership teams to embed sustainability into long-term strategy."
            bullets={[
              "Net Zero transition planning & climate risk modeling",
              "Supply chain sustainability & circular economy strategies",
              "Materiality assessments & stakeholder engagement",
              "Executive ESG advisory for boards and C-suites",
            ]}
            outcome="Resilient business models, stronger market reputation, and long-term value creation."
          />

          <ServiceCard
            number="5"
            title="Training & Executive Briefings – Environmental Management Systems"
            lead="Empower your team with the tools and knowledge to lead."
            bullets={[
              "ISO 14001 & ESG compliance staff training",
              "Executive briefings on regulations, trends, and emerging risks",
              "Workshops on AI integration in sustainability reporting",
              "Tailored learning programs for sustainability teams",
            ]}
            outcome="In-house expertise, leadership alignment, and a culture of sustainability excellence."
          />
        </div>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base sm:text-lg leading-relaxed text-slate-800">
              Ready to get started? Let’s explore how we can support your sustainability journey.
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

/** Reusable service section (emerald theme) */
function ServiceCard({
  number,
  title,
  lead,
  bullets,
  outcome,
}: {
  number: string;
  title: string;
  lead: string;
  bullets: string[];
  outcome: string;
}) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200 sm:p-8">
      <header className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
          {number}
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight text-slate-900">
          {title}
        </h2>
      </header>

      <p className="mb-4  leading-relaxed text-slate-700">{lead}</p>

      <ul className="mb-5 grid gap-3 sm:grid-cols-2">
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

      <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <p className="text-sm sm:text-base text-emerald-900/90">
          <span className="font-semibold text-emerald-900">Outcome:</span> {outcome}
        </p>
      </div>
    </section>
  );
}
