"use client";

import Image from "next/image";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type GalleryImage = { src: string; alt: string };

type GalleryTab = { id: string; label: string; images: GalleryImage[] };

export default function ProjectGallery({ tabs }: { tabs: GalleryTab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeImages = tabs.find((t) => t.id === activeTab)?.images ?? [];

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const lightboxPrev = useCallback(() => {
    if (lightboxIndex === null || activeImages.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + activeImages.length) % activeImages.length);
  }, [lightboxIndex, activeImages.length]);

  const lightboxNext = useCallback(() => {
    if (lightboxIndex === null || activeImages.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % activeImages.length);
  }, [lightboxIndex, activeImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-emerald-100 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setLightboxIndex(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {activeImages.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-video overflow-hidden rounded-lg bg-slate-100 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-900/0 transition-colors duration-300 group-hover:bg-slate-900/35" />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg">
                <ZoomIn className="h-5 w-5" aria-hidden />
              </span>
            </span>
          </button>
        ))}
      </div>

      {lightboxIndex !== null && activeImages[lightboxIndex] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>
          {activeImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxPrev();
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxNext();
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
                aria-label="Next image"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          ) : null}
          <div
            className="relative max-h-[85vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-2xl">
              <Image
                src={activeImages[lightboxIndex].src}
                alt={activeImages[lightboxIndex].alt}
                fill
                className="object-contain bg-black"
                sizes="100vw"
                priority
              />
            </div>
            <p className="mt-3 text-center text-sm text-slate-300">
              {activeImages[lightboxIndex].alt}
            </p>
            <p className="mt-1 text-center text-xs text-slate-500">
              {lightboxIndex + 1} of {activeImages.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
