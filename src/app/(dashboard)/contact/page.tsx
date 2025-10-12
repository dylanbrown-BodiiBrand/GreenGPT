// src/app/contact/page.tsx
import PageWrapper from "../../components/PageWrapper";

export default function ContactPage() {
  return (
    // Render our own H1 to control alignment & styling
    <PageWrapper title="">
      <section className="mx-auto max-w-5xl space-y-12 text-left">
        {/* H1 + Intro */}
        <div className="space-y-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Contact Us
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-700">
            We’d love to hear from you. Whether you’re exploring green accounting solutions,
            ESG compliance support, or AI-powered insights with <strong>GreenGPT™</strong>,
            our team is here to help.
          </p>
        </div>

        {/* Primary actions */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Book a Call */}
          <ContactCard
            emoji="📞"
            title="Book a Call"
            body="Schedule a free consultation with our sustainability experts to discuss your goals."
            action={{
              href: "https://cal.com/the-green-executive-briefing",
              label: "Book a Call",
              external: true,
            }}
          />

          {/* Email Us */}
          <ContactCard
            emoji="📧"
            title="Email Us"
            body="For inquiries, partnerships, or media requests, email our team."
            action={{
              href: "mailto:Dylan.Brown@BodiiBrand.com",
              label: "Email Dylan",
              external: false,
            }}
            subText="Dylan.Brown@BodiiBrand.com"
          />
        </div>

        {/* Connect With Us */}
        <section className="rounded-2xl border border-emerald-200/60 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Connect With Us</h2>
          <p className="mt-2 max-w-3xl text-slate-700">
            Follow us on LinkedIn to stay updated on sustainability insights and industry news.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://www.linkedin.com/in/dylan-brown416/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
              aria-label="Dylan Brown on LinkedIn"
            >
              Personal LinkedIn
            </a>
            <a
              href="https://www.linkedin.com/company/the-green-executive-briefing/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
              aria-label="The Green Executive Briefing on LinkedIn"
            >
              Company LinkedIn
            </a>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-emerald-200/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base leading-relaxed text-slate-800">
            Prefer a quick chat? Book a free 30-minute executive briefing.
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

/** Reusable card for contact methods (emerald theme) */
function ContactCard({
  emoji,
  title,
  body,
  action,
  subText,
}: {
  emoji: string;
  title: string;
  body: string;
  action: { href: string; label: string; external?: boolean };
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:ring-emerald-200 sm:p-8">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="text-xl">{emoji}</span>
        <h3 className="text-lg sm:text-xl font-semibold leading-tight text-slate-900">
          {title}
        </h3>
      </div>
      <p className="leading-relaxed text-slate-700">{body}</p>
      {subText && (
        <p className="mt-2 break-all text-sm text-slate-600">{subText}</p>
      )}
      <div className="mt-5">
        <a
          href={action.href}
          {...(action.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
        >
          {action.label}
        </a>
      </div>
    </div>
  );
}
