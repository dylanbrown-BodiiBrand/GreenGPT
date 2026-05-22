"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type CarouselImage = {
  src: string;
  alt: string;
};

export default function ProjectImageCarousel({
  images,
  label,
}: {
  images: CarouselImage[];
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (count === 0) return null;

  const current = images[index];

  return (
    <div
      className="space-y-3"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photo gallery`}
    >
      <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-slate-900/5 shadow-inner">
        <div className="relative aspect-[16/10] w-full">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            className="object-cover object-center transition-opacity duration-300"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-slate-800 shadow-md transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-slate-800 shadow-md transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {index + 1} / {count}
            </div>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                i === index
                  ? "border-emerald-600 ring-1 ring-emerald-600/30"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`View image ${i + 1} of ${count}`}
              aria-current={i === index}
            >
              <Image src={img.src} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
