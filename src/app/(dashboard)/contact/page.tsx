import ContactForm from "../../components/ContactForm";
import PageWrapper from "../../components/PageWrapper";
import Link from "next/link";

const CAL_URL = "https://cal.com/the-green-executive-briefing";

export default function ContactPage() {
  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        <div className="space-y-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#0B3D2E]">Contact</h1>
          <p className="text-lg leading-relaxed text-slate-700">
            Reach GreenGPT Advisory about a facility compliance diagnostic, managed EHS program, or scoped pilot.
            Prefer the structured intake?{" "}
            <Link href="/intake" className="font-semibold text-emerald-800 underline">
              Request a diagnostic
            </Link>
            .
          </p>
        </div>

        <ContactForm source="contact" />

        <div className="grid gap-6 sm:grid-cols-2">
          <ContactCard
            title="Book a Call"
            body="Schedule a conversation about your facilities, current tracking methods, and the right engagement path."
            action={{ href: CAL_URL, label: "Book a Call", external: true }}
          />
          <ContactCard
            title="Email"
            body="For engagement questions and partnerships."
            action={{
              href: "mailto:dylan.brown@greengptadvisory.com",
              label: "Email Dylan",
            }}
            subText="dylan.brown@greengptadvisory.com"
          />
        </div>

        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Connect</h2>
          <p className="mt-2 max-w-3xl text-slate-700">
            Follow updates on LinkedIn. Company identity is GreenGPT Advisory; The Green Executive Briefing remains a
            content series name where applicable.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://www.linkedin.com/in/dylan-brown416/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:ring-1 hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
            >
              Personal LinkedIn
            </a>
          </div>
        </section>
      </section>
    </PageWrapper>
  );
}

function ContactCard({
  title,
  body,
  action,
  subText,
}: {
  title: string;
  body: string;
  action: { href: string; label: string; external?: boolean };
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 leading-relaxed text-slate-700">{body}</p>
      {subText && <p className="mt-2 break-all text-sm text-slate-600">{subText}</p>}
      <div className="mt-5">
        <a
          href={action.href}
          {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="inline-flex items-center justify-center rounded-xl bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3326]"
        >
          {action.label}
        </a>
      </div>
    </div>
  );
}
