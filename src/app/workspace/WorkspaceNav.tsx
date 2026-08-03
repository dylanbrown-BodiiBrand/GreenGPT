"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/workspace", label: "Overview" },
  { href: "/workspace/facilities", label: "Facilities" },
  { href: "/workspace/obligations", label: "Obligations" },
  { href: "/workspace/actions", label: "Actions" },
  { href: "/workspace/evidence", label: "Evidence" },
  { href: "/workspace/documents", label: "Documents" },
  { href: "/workspace/ask", label: "Ask GreenGPT" },
  { href: "/workspace/briefings", label: "Briefings" },
] as const;

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className="border-b border-[#E8E6E0] bg-white">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {LINKS.map((link) => {
          const active =
            link.href === "/workspace"
              ? pathname === "/workspace"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B3D2E] ${
                active
                  ? "bg-[#ECFDF5] text-[#0B3D2E]"
                  : "text-[#374944] hover:bg-[#F5F5F0]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
