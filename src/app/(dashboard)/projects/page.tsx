// src/app/projects/page.tsx
import Image from "next/image";
import PageWrapper from "../../components/PageWrapper";
import ProjectImageCarousel, { type CarouselImage } from "../../components/ProjectImageCarousel";

const CHPE_GALLERY: CarouselImage[] = [
  {
    src: "/projects/chpe-hero.png",
    alt: "Commissioning team meeting in a field office with Hitachi Energy personnel reviewing site plans",
  },
  {
    src: "/projects/chpe-01-sld.png",
    alt: "Single-line diagram of station-level MV and LV switchgear, transformer, and diesel generator with ATS",
  },
  {
    src: "/projects/chpe-02-loto-register.png",
    alt: "Hitachi Energy group lock box register for lockout-tagout coordination on site",
  },
  {
    src: "/projects/chpe-03-lockout.png",
    alt: "Group lock box secured with danger tags and padlocks during energized equipment lockout",
  },
  {
    src: "/projects/chpe-04-hv-test.png",
    alt: "High-voltage test hall with HVDC equipment, corona rings, and construction lift",
  },
  {
    src: "/projects/chpe-05-control-cabinet.png",
    alt: "Technicians working on Hitachi auxiliary control cabinet during commissioning",
  },
  {
    src: "/projects/chpe-06-field-work.png",
    alt: "Technician in boom lift basket working on outdoor high-voltage bushings at converter station",
  },
  {
    src: "/projects/chpe-07-switchgear.png",
    alt: "38 kV switchgear and medium-voltage cubicles with line and load side compartments open",
  },
];

const SUNZIA_GALLERY: CarouselImage[] = [
  {
    src: "/projects/sunzia-hero.png",
    alt: "Outdoor converter cooling bank with ABB equipment at a high-voltage transmission site",
  },
  {
    src: "/projects/sunzia-01-mv-panel.png",
    alt: "Technicians in high-visibility gear inspecting an outdoor medium-voltage control panel",
  },
  {
    src: "/projects/sunzia-02-hv-test.png",
    alt: "High-voltage equipment assembly and testing inside an industrial test facility",
  },
  {
    src: "/projects/sunzia-03-field-work.png",
    alt: "Aerial lift access for field work on outdoor electrical infrastructure",
  },
];

const CHPE_NERC_SERVICES = [
  "NERC registration strategy and support (initial and ongoing)",
  "Determination of applicable O&P and CIP Reliability Standards for CHPE's operating model",
  "Design and implementation of a structured SharePoint-based NERC evidence repository (O&P and CIP), or integration with an existing GRC tool where applicable",
  "Coordination with NYISO (ISO/RTO) on registration and operational requirements",
  "Coordination with NPCC (Regional Entity) on registration and compliance expectations",
  "Foundational program setup and recommendations to build out a sustainable compliance function",
];

export default function ProjectsPage() {
  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        <div className="space-y-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Projects
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-700">
            We are actively supporting major HVDC and renewable transmission initiatives across
            the U.S. Explore current engagements below, along with how we drive safety,
            sustainability, and executive clarity on every site.
          </p>
        </div>

        <hr className="border-t border-emerald-200/70" />

        <div className="space-y-16">
          <h2 className="text-2xl font-semibold text-slate-900">Current Projects</h2>

          <FeaturedProjectSection
            badge="Current Project"
            title="Champlain Hudson Power Express (CHPE)"
            subtitle="Buried HVDC transmission delivering clean hydropower from Québec to the New York metro area."
            description="Our team supports CHPE through construction and commissioning efforts—coordinating field safety, technical readiness, and stakeholder alignment as converter stations and grid interfaces come online."
            bullets={[
              "HVDC buried cable technology with minimal overhead visual impact",
              "Active commissioning support across converter and station deliverables",
              "NERC Reliability Standards alignment (O&P and CIP) as operations mature",
            ]}
            href="https://chpexpress.com/project-overview/the-technology/"
            linkLabel="The Technology"
            imageSrc="/projects/chpe-hero.png"
            imageAlt="Commissioning team meeting in a field office with Hitachi Energy personnel reviewing site plans"
            gallery={CHPE_GALLERY}
            galleryLabel="CHPE"
            nercServices={CHPE_NERC_SERVICES}
          />

          <FeaturedProjectSection
            badge="Current Project"
            title="SunZia West"
            subtitle="Arizona segment of the SunZia Wind and Transmission program—among the largest clean energy infrastructure efforts in the U.S."
            description="We contribute to SunZia West during construction and commissioning of converter, switchyard, and interconnection assets that connect New Mexico wind resources to Western load centers."
            bullets={[
              "±525 kV HVDC corridor from central New Mexico to south-central Arizona",
              "Up to ~3,000 MW of renewable capacity with Western grid interconnection",
              "NERC compliance planning as the operating entity scales toward commercial operations",
            ]}
            href="https://patternenergy.com/projects/sunzia/"
            linkLabel="SunZia Project Overview"
            imageSrc="/projects/sunzia-hero.png"
            imageAlt="Outdoor converter cooling bank with ABB equipment at a high-voltage transmission site"
            gallery={SUNZIA_GALLERY}
            galleryLabel="SunZia West"
          />
        </div>

        <hr className="border-t border-emerald-200/70" />

        <ProjectCard
          badge="HSE Engagement"
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

function FeaturedProjectSection({
  badge,
  title,
  subtitle,
  description,
  bullets,
  href,
  linkLabel,
  imageSrc,
  imageAlt,
  gallery,
  galleryLabel,
  nercServices,
}: {
  badge?: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  href: string;
  linkLabel: string;
  imageSrc: string;
  imageAlt: string;
  gallery: CarouselImage[];
  galleryLabel: string;
  nercServices?: string[];
}) {
  return (
    <article className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200">
        <div className="relative aspect-[21/9] w-full bg-slate-100 sm:aspect-[2.4/1]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 896px"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <header className="space-y-3">
            {badge ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {badge}
              </span>
            ) : null}
            <h3 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{title}</h3>
            <p className="text-lg leading-relaxed text-slate-700">{subtitle}</p>
            <p className="leading-relaxed text-slate-600">{description}</p>
          </header>

          <ul className="space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckIcon />
                <span className="leading-relaxed text-slate-800">{b}</span>
              </li>
            ))}
          </ul>

          {nercServices ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Potential NERC compliance support (CHPE)
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {nercServices.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-snug text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
          >
            {linkLabel}
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          On-site gallery
        </h4>
        <ProjectImageCarousel images={gallery} label={galleryLabel} />
      </div>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
        {subtitle ? <p className="leading-relaxed text-slate-700">{subtitle}</p> : null}
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
                  <CheckIcon />
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
