"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "../logo.png";

const CAL_URL = "https://cal.com/the-green-executive-briefing";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/briefing/demo", label: "Sample Briefing" },
  { href: "/services", label: "Solutions" },
  { href: "/about", label: "About" },
] as const;

export default function NavigationMenu() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalOpen, setIsCalOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const openCal = () => {
    setIsCalOpen(true);
    closeMenu();
  };
  const closeCal = () => setIsCalOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsCalOpen(false);
    if (isCalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCalOpen]);

  const linkClass = (href: string) => {
    const base = href.split("#")[0] || "/";
    const active = pathname === base && !href.includes("#");
    return `hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
      active ? "text-green-800 font-semibold" : ""
    }`;
  };

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-4 py-4 border-b border-gray-300 bg-[#F5F5F0] sm:px-6">
      <Link href="/" className="flex items-center gap-2 min-w-0" onClick={closeMenu}>
        <Image src={logo} alt="GreenGPT Advisory" width={32} height={32} />
        <span className="font-semibold text-base sm:text-lg text-gray-800 truncate">
          GreenGPT Advisory
        </span>
      </Link>

      <nav className="hidden lg:flex gap-6 text-base font-semibold text-gray-700" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass(link.href)}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden lg:flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-semibold text-gray-700 hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          Sign in
        </Link>
        <Link
          href="/workspace"
          className="text-sm font-semibold text-gray-700 hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          Workspace
        </Link>
        <button
          type="button"
          className="bg-[#0B3D2E] text-white px-4 py-2 rounded-lg hover:bg-[#0a3326] cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          onClick={openCal}
        >
          Book a Call
        </button>
      </div>

      <button
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        className="lg:hidden flex flex-col gap-1.5 cursor-pointer p-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        onClick={() => setIsMenuOpen((v) => !v)}
      >
        <span className="w-6 h-0.5 bg-gray-800" />
        <span className="w-6 h-0.5 bg-gray-800" />
        <span className="w-6 h-0.5 bg-gray-800" />
      </button>

      {isMenuOpen && (
        <ul className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-md flex flex-col p-4 gap-3 lg:hidden z-30">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={closeMenu} className="block py-1 font-medium text-gray-800">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/workspace" onClick={closeMenu} className="block py-1 font-medium text-gray-800">
              Workspace
            </Link>
          </li>
          <li>
            <Link href="/login" onClick={closeMenu} className="block py-1 font-medium text-gray-800">
              Sign in
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="w-full text-left text-[#0B3D2E] font-semibold py-1"
              onClick={openCal}
            >
              Book a Call
            </button>
          </li>
        </ul>
      )}

      {isCalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="cal-modal-title"
        >
          <div className="absolute inset-0 bg-black/50" onClick={closeCal} />
          <div
            className="relative z-50 w-[95vw] md:w-[900px] max-w-[95vw] bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 id="cal-modal-title" className="text-lg font-semibold text-gray-800">
                Book a Call
              </h2>
              <button
                type="button"
                onClick={closeCal}
                aria-label="Close"
                className="rounded p-1 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full" style={{ height: "80vh" }}>
              <iframe src={CAL_URL} title="Book a call with GreenGPT Advisory" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
