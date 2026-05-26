import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import NercAccordion from "./NercAccordion";

export type ProjectStat = { headline: string; subtext: string };

type ProjectHeroSectionProps = {
  badge?: string;
  title: string;
  overlayTitle: string;
  subtitle: string;
  description: string;
  stats: ProjectStat[];
  href: string;
  linkLabel: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  nercServices?: string[];
};

export default function ProjectHeroSection({
  badge,
  title,
  overlayTitle,
  subtitle,
  description,
  stats,
  href,
  linkLabel,
  imageSrc,
  imageAlt,
  imagePosition,
  nercServices,
}: ProjectHeroSectionProps) {
  const imageBlock = (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200/60 lg:aspect-[16/10]">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority={imagePosition === "left"}
        loading={imagePosition === "left" ? undefined : "lazy"}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="absolute bottom-4 left-4 right-4 text-xl font-bold tracking-tight text-white drop-shadow-md sm:text-2xl">
        {overlayTitle}
      </span>
    </div>
  );

  const contentBlock = (
    <div className="flex flex-col justify-center space-y-5">
      {badge ? (
        <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {badge}
        </span>
      ) : null}
      <div>
        <h3 className="border-l-4 border-emerald-600 pl-4 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">{subtitle}</p>
        <p className="mt-2 leading-relaxed text-slate-600">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.headline}
            className="rounded-xl border border-emerald-100/80 bg-slate-50/90 p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </div>
            <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">{stat.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {nercServices ? <NercAccordion items={nercServices} /> : null}

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center justify-center rounded-xl border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 focus-visible:ring-offset-2"
      >
        {linkLabel}
      </Link>
    </div>
  );

  return (
    <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      {imagePosition === "left" ? (
        <>
          <div>{imageBlock}</div>
          <div>{contentBlock}</div>
        </>
      ) : (
        <>
          <div className="lg:order-1">{contentBlock}</div>
          <div className="lg:order-2">{imageBlock}</div>
        </>
      )}
    </article>
  );
}
