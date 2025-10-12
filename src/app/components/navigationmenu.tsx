"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "../logo.png";

const CAL_URL = "https://cal.com/the-green-executive-briefing"; // swap to your booking link

export default function NavigationMenu() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalOpen, setIsCalOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const closeMenu = () => setIsMenuOpen(false);

  const openCal = () => {
    setIsCalOpen(true);
    closeMenu();
  };
  const closeCal = () => setIsCalOpen(false);

  // Close Cal modal on ESC
  useEffect(() => {
    const onKey = (e: { key: string; }) => e.key === "Escape" && setIsCalOpen(false);
    if (isCalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCalOpen]);

  // helper for active link styling (keeps current design, just adds active color)
  const linkClass = (href: string) =>
    `hover:text-green-700 ${pathname === href ? "text-green-700 font-semibold" : ""}`;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-[#F5F5F0]">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = "/"}>
      <Image src={logo} alt="Green Accounting Logo" width={32} height={32} />
      <span className="font-semibold text-lg text-gray-800">The Green Executive Briefing</span>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex gap-8 text-lg font-semibold text-gray-700">
      <Link href="/" className={linkClass("/")}>
        Home
      </Link>
      <Link href="/about" className={linkClass("/about")}>
        About
      </Link>
      <Link href="/services" className={linkClass("/services")}>
        Services
      </Link>
      <Link href="/projects" className={linkClass("/projects")}>
        Projects
      </Link>
      <Link href="/greengpt" className={linkClass("/greengpt")}>
        GreenGPT
      </Link>
      <Link href="/contact" className={linkClass("/contact")}>
        Contact
      </Link>
      </nav>

      {/* Burger Menu (Mobile) */}
      <button
      aria-label="Open menu"
      className="md:hidden flex flex-col gap-1 cursor-pointer"
      onClick={toggleMenu}
      >
      <span className="w-6 h-0.5 bg-gray-800" />
      <span className="w-6 h-0.5 bg-gray-800" />
      <span className="w-6 h-0.5 bg-gray-800" />
      </button>

      {/* Book a Call (Desktop) */}
      <button
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 hidden md:block cursor-pointer"
      onClick={openCal}
      >
      Book a Call
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
      <ul className="absolute top-16 right-4 bg-white border rounded shadow-md flex flex-col items-start p-4 gap-4 md:hidden z-30">
        <li>
        <Link href="/" onClick={closeMenu}>
          Home
        </Link>
        </li>
        <li>
        <Link href="/about" onClick={closeMenu}>
          About
        </Link>
        </li>
        <li>
        <Link href="/services" onClick={closeMenu}>
          Services
        </Link>
        </li>
        <li>
        <Link href="/projects" onClick={closeMenu}>
          Projects
        </Link>
        </li>
        <li>
        <Link href="/greengpt" onClick={closeMenu}>
          GreenGPT
        </Link>
        </li>
        <li>
        <Link href="/contact" onClick={closeMenu}>
          Contact
        </Link>
        </li>
        <li>
        <button
          className="w-full text-left text-green-600 font-semibold hover:underline"
          onClick={openCal}
        >
          Book a Call
        </button>
        </li>
      </ul>
      )}

      {/* Cal.com Modal */}
      {isCalOpen && (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center"
        aria-modal="true"
        role="dialog"
        aria-labelledby="cal-modal-title"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={closeCal} />
        {/* Dialog */}
        <div
        className="relative z-50 w-[95vw] md:w-[900px] max-w-[95vw] bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 id="cal-modal-title" className="text-lg font-semibold text-gray-800">
          Book a Call
          </h2>
          <button
          onClick={closeCal}
          aria-label="Close"
          className="rounded p-1 hover:bg-gray-100"
          >
          ✕
          </button>
        </div>

        {/* Responsive iframe wrapper keeps a nice aspect on mobile */}
        <div className="relative w-full" style={{ height: "80vh" }}>
          <iframe
          src={CAL_URL}
          title="Cal.com Booking"
          className="w-full h-full"
          frameBorder="0"
          />
        </div>
        </div>
      </div>
      )}
    </header>
  );
}
