// src/app/about/page.tsx
import PageWrapper from "../../components/PageWrapper";

export default function AboutPage() {
  return (
    // Render our own H1 so we control alignment & styling
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12">
        {/* H1 + Intro + CTA */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold  tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              About Us
            </span>
          </h1>

          <p className=" text-lg  text-slate-700">
            At <strong>The Green Executive Briefing</strong>, we believe sustainability should be both
            strategic and actionable. We help businesses cut through complexity, meet global standards,
            and turn sustainability reporting into a source of confidence—not confusion.
          </p>

          <a
            href="https://cal.com/the-green-executive-briefing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
          >
            Get a 30-min Executive Briefing
          </a>
        </div>

        <hr className="border-t border-emerald-200/70" />

        {/* Who We Are */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold  text-slate-900">Who We Are</h2>
          <p className="  text-slate-700">
            We are sustainability professionals and ISO&nbsp;14001 auditors with deep expertise in
            greenhouse gas accounting, ESG compliance, and environmental management systems. Our
            experience spans multinational corporations, regulatory frameworks, and real-world emissions
            reduction strategies.
          </p>
          <p className="  text-slate-700">
            Unlike traditional consultants, we combine technical compliance expertise with AI-powered
            tools to deliver insights faster, with fewer errors, and at a fraction of the manual effort.
          </p>
        </section>

        {/* What We Do (single-column checklist) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold  text-slate-900">What We Do</h2>
          <ul className="space-y-3">
            {[
              "Ensure compliance with GHG Protocol, ISO 14001, and global ESG standards",
              "Build credible and audit-ready carbon footprints and LCAs",
              "Translate sustainability data into financially meaningful insights",
              "Integrate AI solutions (like our proprietary GreenGPT™) into ESG processes",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                {/* Check icon with emerald accent */}
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
                <span className=" text-slate-800">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">GreenGPT™</strong> drafts disclosures, maps data to
            standards, and flags evidence gaps—accelerating audit readiness.
          </p>
        </section>

        {/* Why We Exist – soft green card */}
        <section className="space-y-3 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <h2 className="text-2xl font-semibold  text-emerald-900">Why We Exist</h2>
          <p className=" text-emerald-900/80">
            Sustainability leaders face increasing pressure from regulators, investors, and customers.
            Data is fragmented, frameworks are complex, and the stakes are high. We simplify green
            accounting, de-risk ESG reporting, and empower executives to lead with confidence.
          </p>
        </section>

        {/* Our Difference – elevated cards with emerald rings */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold  text-slate-900">Our Difference</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                k: "Standards-first approach",
                v: "Grounded in ISO 14001, GHG Protocol, and ESG frameworks.",
              },
              {
                k: "AI-powered insights",
                v: "Automated mapping, drafting, and gap checks via GreenGPT™.",
              },
              {
                k: "Executive focus",
                v: "Clear, concise briefings designed for C-suites and boards.",
              },
              {
                k: "Trusted expertise",
                v: "Years of hands-on consulting, auditing, and sustainability leadership.",
              },
            ].map(({ k, v }) => (
              <div
                key={k}
                className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200"
              >
                <h3 className="text-lg font-semibold text-slate-900">{k}</h3>
                <p className="mt-1 text-sm  text-slate-700">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-emerald-200/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base  text-slate-800">
            Ready to move from complexity to confidence?
          </p>
          <a
            href="https://cal.com/the-green-executive-briefing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
          >
            Book a Call
          </a>
        </section>
      </section>
    </PageWrapper>
  );
}
