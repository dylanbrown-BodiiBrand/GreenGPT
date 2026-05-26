// src/app/projects/page.tsx
import PageWrapper from "../../components/PageWrapper";
import SectionDivider from "../../components/projects/SectionDivider";
import ProjectHeroSection from "../../components/projects/ProjectHeroSection";
import ProjectGallery, { type GalleryImage } from "../../components/projects/ProjectGallery";
import HseDeliverablesGrid from "../../components/projects/HseDeliverablesGrid";

const CHPE_GALLERY: GalleryImage[] = [
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
  {
    src: "/projects/chpe-08-valve-hall.png",
    alt: "HVDC converter valve hall with valve towers, insulators, and overhead electrical infrastructure",
  },
  {
    src: "/projects/chpe-09-commissioning.png",
    alt: "Technician in arc-rated PPE performing commissioning work on indoor electrical switchgear",
  },
  {
    src: "/projects/chpe-10-abb-switchgear.png",
    alt: "ABB switchgear and control panels with overhead cable trays in a converter station control room",
  },
];

const SUNZIA_GALLERY: GalleryImage[] = [
  {
    src: "/projects/sunzia-hero.png",
    alt: "Outdoor converter cooling bank with ABB equipment at a high-voltage transmission site",
  },
  {
    src: "/projects/sunzia-01-mv-panel.png",
    alt: "Technicians in high-visibility gear inspecting an outdoor medium-voltage control panel",
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

const HSE_SECTIONS = [
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
];

export default function ProjectsPage() {
  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-6xl space-y-14 text-left">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Projects
            </span>
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
            We are actively supporting major HVDC and renewable transmission initiatives across
            the U.S. Explore current engagements below, along with how we drive safety,
            sustainability, and executive clarity on every site.
          </p>
        </div>

        <SectionDivider />

        <div className="space-y-16">
          <div>
            <h2 className="mb-10 text-2xl font-bold text-slate-900 sm:text-3xl">Current Projects</h2>

            <div className="space-y-20">
              <ProjectHeroSection
                badge="Current Project"
                title="Champlain Hudson Power Express (CHPE)"
                overlayTitle="CHPE"
                subtitle="Buried HVDC transmission delivering clean hydropower from Québec to the New York metro area."
                description="Our team supports CHPE through construction and commissioning efforts—coordinating field safety, technical readiness, and stakeholder alignment as converter stations and grid interfaces come online."
                stats={[
                  {
                    headline: "HVDC Buried Cable",
                    subtext: "HVDC buried cable technology with minimal overhead visual impact",
                  },
                  {
                    headline: "Commissioning Support",
                    subtext: "Active commissioning support across converter and station deliverables",
                  },
                  {
                    headline: "NERC Alignment",
                    subtext: "NERC Reliability Standards alignment (O&P and CIP) as operations mature",
                  },
                ]}
                href="https://chpexpress.com/project-overview/the-technology/"
                linkLabel="The Technology"
                imageSrc="/projects/chpe-hero.png"
                imageAlt="Commissioning team meeting in a field office with Hitachi Energy personnel reviewing site plans"
                imagePosition="left"
                nercServices={CHPE_NERC_SERVICES}
              />

              <ProjectHeroSection
                badge="Current Project"
                title="SunZia West"
                overlayTitle="SunZia West"
                subtitle="Arizona segment of the SunZia Wind and Transmission program—among the largest clean energy infrastructure efforts in the U.S."
                description="We contribute to SunZia West during construction and commissioning of converter, switchyard, and interconnection assets that connect New Mexico wind resources to Western load centers."
                stats={[
                  {
                    headline: "±525 kV HVDC",
                    subtext: "±525 kV HVDC corridor from central New Mexico to south-central Arizona",
                  },
                  {
                    headline: "~3,000 MW Capacity",
                    subtext: "Up to ~3,000 MW of renewable capacity with Western grid interconnection",
                  },
                  {
                    headline: "NERC Compliance",
                    subtext: "NERC compliance planning as the operating entity scales toward commercial operations",
                  },
                ]}
                href="https://patternenergy.com/projects/sunzia/"
                linkLabel="SunZia Project Overview"
                imageSrc="/projects/sunzia-hero.png"
                imageAlt="Outdoor converter cooling bank with ABB equipment at a high-voltage transmission site"
                imagePosition="right"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
            <h3 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">On-Site Gallery</h3>
            <ProjectGallery
              tabs={[
                { id: "chpe", label: "CHPE Gallery", images: CHPE_GALLERY },
                { id: "sunzia", label: "SunZia Gallery", images: SUNZIA_GALLERY },
              ]}
            />
          </div>
        </div>

        <SectionDivider />

        <HseDeliverablesGrid
          badge="HSE Engagement"
          title="HSE Consulting Deliverables"
          subtitle="Comprehensive health, safety, and environmental oversight during construction and commissioning."
          sections={HSE_SECTIONS}
          outcome="A safer site, reduced risk exposure, compliance certainty, and a world-class safety culture that protects people and projects."
        />

        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base leading-relaxed text-slate-800 sm:text-lg">
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
