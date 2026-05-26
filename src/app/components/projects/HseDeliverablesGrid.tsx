import { Leaf } from "lucide-react";

type HseSection = { number: string; title: string; bullets: string[] };

export default function HseDeliverablesGrid({
  badge,
  title,
  subtitle,
  sections,
  outcome,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  sections: HseSection[];
  outcome: string;
}) {
  return (
    <article>
      <header className="mb-8 space-y-2">
        {badge ? (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {badge}
          </span>
        ) : null}
        <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="text-lg leading-relaxed text-slate-700">{subtitle}</p> : null}
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ number, title, bullets }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
                {number}
              </span>
              <h3 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">{title}</h3>
            </div>
            <ul className="space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-emerald-50/90 to-teal-50/80 p-5 shadow-sm sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-700">
          <Leaf className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-base italic leading-relaxed text-emerald-950/90 sm:text-lg">
          <span className="not-italic font-semibold text-emerald-900">Outcome: </span>
          {outcome}
        </p>
      </div>
    </article>
  );
}
