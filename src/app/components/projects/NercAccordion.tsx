"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function NercAccordion({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 border-l-4 border-emerald-600 bg-emerald-50/80 rounded-r-xl p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-emerald-900 sm:text-base"
        aria-expanded={open}
      >
        <span>Potential NERC Compliance Support (CHPE)</span>
        <span className="flex shrink-0 items-center gap-1 text-emerald-700">
          {open ? "Hide" : "View Details"}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {open ? (
        <ul className="mt-4 space-y-2 border-t border-emerald-200/60 pt-4">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
