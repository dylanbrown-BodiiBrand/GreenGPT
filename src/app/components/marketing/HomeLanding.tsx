import Link from "next/link";

const CAL_URL = "https://cal.com/the-green-executive-briefing";

const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-[#0B3D2E] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#0a3326] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2";

const outlineBtn =
  "inline-flex items-center justify-center rounded-xl border-2 border-[#0B3D2E] bg-white px-5 py-3 text-base font-semibold text-[#0B3D2E] shadow-sm transition hover:bg-[#F5F5F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2";

const section = "mx-auto max-w-5xl px-4 sm:px-6";

export default function HomeLanding() {
  return (
    <div className="bg-[#FAFDF7] text-[#1B2A22]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Hero */}
      <section className="border-b border-[#E8E6E0] bg-gradient-to-b from-[#0B3D2E] to-[#0f4d3a] text-white">
        <div className={`${section} py-16 sm:py-20`}>
          <p className="font-['Outfit',sans-serif] text-xs font-semibold uppercase tracking-[0.18em] text-[#6EE7B7]">
            Managed EHS compliance for industrial facilities
          </p>
          <h1 className="mt-4 max-w-3xl font-['Instrument_Serif',serif] text-4xl leading-tight sm:text-5xl">
            Never miss another EHS compliance obligation.
          </h1>
          <p className="mt-5 max-w-2xl font-['Outfit',sans-serif] text-base font-light leading-relaxed text-white/80 sm:text-lg">
            GreenGPT Advisory builds and helps manage facility-specific compliance calendars, obligation
            registers, and audit-ready workflows for manufacturers without large in-house EHS teams.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/intake" className="inline-flex items-center justify-center rounded-xl bg-[#10B981] px-5 py-3 text-base font-semibold text-[#0B3D2E] shadow-sm transition hover:bg-[#34d399] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3D2E]">
              Request a Facility Compliance Diagnostic
            </Link>
            <Link href="/briefing/demo" className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 bg-transparent px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3D2E]">
              View a Sample Compliance Briefing
            </Link>
          </div>
          <p className="mt-6 max-w-2xl font-['Outfit',sans-serif] text-sm text-white/65">
            Built and human-reviewed by an experienced EHS professional. Your team remains the final decision owner.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section className={`${section} py-14 sm:py-16`} aria-labelledby="for-whom">
        <h2 id="for-whom" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
          Built for overloaded EHS and operations leaders
        </h2>
        <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
          U.S. manufacturers with roughly 50–500 employees and one to five facilities — where compliance still
          lives in spreadsheets, SharePoint, Outlook, and the heads of experienced people.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            "EHS managers covering too many sites alone",
            "Plant and facility managers accountable for inspections and permits",
            "Operations leaders who need visibility without another enterprise platform",
            "Regional EHS directors who need consistent follow-through across facilities",
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl border border-[#E8E6E0] bg-white px-5 py-4 font-['Outfit',sans-serif] text-sm leading-relaxed text-[#1B2A22]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Problem */}
      <section className="border-y border-[#E8E6E0] bg-white" aria-labelledby="problem">
        <div className={`${section} py-14 sm:py-16`}>
          <h2 id="problem" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
            The problem is follow-through, not expertise
          </h2>
          <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
            Most mid-size manufacturers already know what “good” looks like. The work breaks down when obligations,
            evidence, and corrective actions are scattered.
          </p>
          <ul className="mt-8 space-y-3 font-['Outfit',sans-serif] text-base text-[#1B2A22]">
            {[
              "Obligations scattered across permits, plans, spreadsheets, SharePoint, email, and experienced employees",
              "Recurring inspections and reporting that depend on one person remembering to chase them",
              "Corrective actions without clear owners, deadlines, evidence, and closure",
              "No current, defensible view of readiness across several facilities",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#10B981]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What you receive */}
      <section className={`${section} py-14 sm:py-16`} aria-labelledby="receive">
        <h2 id="receive" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
          What you receive
        </h2>
        <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
          A facility-specific compliance operating system — maintained with human review — not a generic chatbot.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Obligation register", body: "Source-linked requirements with owners, frequency, and status." },
            { title: "Compliance calendar", body: "Deadlines monitored with clear upcoming and overdue views." },
            { title: "Corrective-action tracking", body: "Findings with owners, due dates, evidence, and closure." },
            { title: "Evidence workflows", body: "Required proof, missing items, and audit-ready status." },
            { title: "Monthly compliance briefing", body: "What changed, what’s due, what needs management attention." },
            { title: "Source-grounded assistance", body: "Draft answers from client-approved materials — reviewed before use." },
          ].map((card) => (
            <article key={card.title} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
              <h3 className="font-['Outfit',sans-serif] text-base font-semibold text-[#0B3D2E]">{card.title}</h3>
              <p className="mt-2 font-['Outfit',sans-serif] text-sm font-light leading-relaxed text-[#374944]">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-[#E8E6E0] bg-white scroll-mt-20" aria-labelledby="how">
        <div className={`${section} py-14 sm:py-16`}>
          <h2 id="how" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
            How the managed service works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Diagnostic", d: "Map facilities, permits, and current tracking methods." },
              { n: "02", t: "Build", d: "Stand up the register, calendar, and priority workflows." },
              { n: "03", t: "Operate", d: "Monitor deadlines, track actions, assemble monthly briefings." },
              { n: "04", t: "Review", d: "Your EHS team reviews drafts; nothing ships as final without approval." },
            ].map((step) => (
              <li key={step.n} className="rounded-xl border border-[#E8E6E0] bg-[#FAFDF7] p-5">
                <div className="font-mono text-xs font-semibold tracking-wider text-[#10B981]">{step.n}</div>
                <h3 className="mt-2 font-['Outfit',sans-serif] text-lg font-semibold text-[#0B3D2E]">{step.t}</h3>
                <p className="mt-2 font-['Outfit',sans-serif] text-sm leading-relaxed text-[#374944]">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Governance */}
      <section className={`${section} py-14 sm:py-16`} aria-labelledby="governance">
        <h2 id="governance" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
          Human review and governance
        </h2>
        <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
          GreenGPT assists qualified EHS professionals; it does not replace them. AI-assisted outputs stay drafts
          until reviewed and approved. Answers should be grounded in client-approved sources. Unsupported answers
          are flagged or declined. This is not legal advice.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {["Draft", "Reviewed", "Approved"].map((state) => (
            <span
              key={state}
              className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 font-['Outfit',sans-serif] text-sm font-semibold text-[#0B3D2E]"
            >
              {state}
            </span>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="border-y border-[#E8E6E0] bg-white" aria-labelledby="offers">
        <div className={`${section} py-14 sm:py-16`}>
          <h2 id="offers" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
            Three progressive offers
          </h2>
          <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
            Start with a paid diagnostic. Expand into managed compliance or a configured workspace when the scope is clear.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <OfferCard
              eyebrow="Entry"
              title="Facility Compliance Diagnostic"
              price="Starting at $750 per facility"
              note="Final pricing based on complexity."
              bullets={[
                "Facility applicability questionnaire",
                "Preliminary federal and state obligation register",
                "Twelve-month compliance calendar",
                "Top potential compliance gaps",
                "Findings review and recommended plan",
              ]}
              cta={{ href: "/intake", label: "Request a Diagnostic" }}
              featured
            />
            <OfferCard
              eyebrow="Core"
              title="Managed EHS Compliance"
              price="Generally $750–$2,000 / facility / month"
              note="Scope-based monthly service."
              bullets={[
                "Maintained obligation register",
                "Calendar and deadline monitoring",
                "Corrective-action tracking",
                "Monthly compliance briefing",
                "Human EHS review",
              ]}
              cta={{ href: "/intake", label: "Discuss Your Facility" }}
            />
            <OfferCard
              eyebrow="Configured"
              title="Custom EHS AI Workspace"
              price="Scope-based setup and support"
              note="Built on your approved materials."
              bullets={[
                "Client-approved document library",
                "Site-aware, source-grounded assistant",
                "Inspection and corrective-action workflows",
                "User training and periodic review",
              ]}
              cta={{ href: "/services#pilot", label: "Explore a 30-Day Pilot" }}
            />
          </div>
        </div>
      </section>

      {/* Sample output */}
      <section className={`${section} py-14 sm:py-16`} aria-labelledby="sample">
        <h2 id="sample" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
          See a representative monthly briefing
        </h2>
        <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
          Preview the structure clients receive each month: upcoming obligations, open actions, evidence gaps, and
          items needing management attention. Sample data is clearly labeled as representative.
        </p>
        <div className="mt-6">
          <Link href="/briefing/demo" className={primaryBtn}>
            View Sample Compliance Briefing
          </Link>
        </div>
      </section>

      {/* Founder */}
      <section className="border-y border-[#E8E6E0] bg-white" aria-labelledby="founder">
        <div className={`${section} py-14 sm:py-16`}>
          <h2 id="founder" className="font-['Instrument_Serif',serif] text-3xl text-[#0B3D2E]">
            Led by an experienced EHS professional
          </h2>
          <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-base leading-relaxed text-[#374944]">
            Dylan Brown founded GreenGPT Advisory to help industrial facilities replace fragile spreadsheet systems
            with maintained, human-reviewed compliance operating systems. Software accelerates delivery; professional
            judgment governs applicability and approval.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/about" className={outlineBtn}>
              About GreenGPT Advisory
            </Link>
            <a href={CAL_URL} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
              Book a Call
            </a>
          </div>
        </div>
      </section>

      {/* Secondary tool */}
      <section className={`${section} py-14 sm:py-16`} aria-labelledby="calendar-tool">
        <h2 id="calendar-tool" className="font-['Instrument_Serif',serif] text-2xl text-[#0B3D2E]">
          Prefer to explore the free calendar tool first?
        </h2>
        <p className="mt-3 max-w-3xl font-['Outfit',sans-serif] text-sm leading-relaxed text-[#374944]">
          Generate a preliminary facility calendar from industry, jurisdiction, and hazard profile. Final applicability
          for your site still requires human review. Managed compliance remains the primary engagement path.
        </p>
        <div className="mt-5">
          <Link href="/ehs-calendar" className={outlineBtn}>
            Open the EHS calendar tool
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0B3D2E] text-white">
        <div className={`${section} py-14 sm:py-16`}>
          <h2 className="font-['Instrument_Serif',serif] text-3xl">
            Request a Facility Compliance Diagnostic
          </h2>
          <p className="mt-3 max-w-2xl font-['Outfit',sans-serif] text-base font-light text-white/75">
            Tell us about your facility. We’ll review the information, schedule a findings discussion, and recommend
            the right next step — diagnostic, managed service, or a scoped pilot.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/intake" className="inline-flex items-center justify-center rounded-xl bg-[#10B981] px-5 py-3 text-base font-semibold text-[#0B3D2E] hover:bg-[#34d399]">
              Start the Diagnostic Intake
            </Link>
            <a
              href={CAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-5 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              Book a Call
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function OfferCard({
  eyebrow,
  title,
  price,
  note,
  bullets,
  cta,
  featured,
}: {
  eyebrow: string;
  title: string;
  price: string;
  note: string;
  bullets: string[];
  cta: { href: string; label: string };
  featured?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-6 ${
        featured ? "border-[#10B981] bg-[#ECFDF5] shadow-sm" : "border-[#E8E6E0] bg-[#FAFDF7]"
      }`}
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#059669]">
        {eyebrow}
      </div>
      <h3 className="mt-2 font-['Outfit',sans-serif] text-xl font-semibold text-[#0B3D2E]">{title}</h3>
      <p className="mt-2 font-['Outfit',sans-serif] text-sm font-semibold text-[#1B2A22]">{price}</p>
      <p className="mt-1 font-['Outfit',sans-serif] text-xs text-[#666]">{note}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 font-['Outfit',sans-serif] text-sm text-[#374944]">
            <span className="text-[#10B981]" aria-hidden>
              ✓
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2 ${
          featured
            ? "bg-[#0B3D2E] text-white hover:bg-[#0a3326]"
            : "border-2 border-[#0B3D2E] text-[#0B3D2E] hover:bg-white"
        }`}
      >
        {cta.label}
      </Link>
    </article>
  );
}
