import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import NavigationMenu from "./components/navigationmenu";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: {
    default: "GreenGPT Advisory | Managed EHS Compliance",
    template: "%s | GreenGPT Advisory",
  },
  description:
    "Managed EHS compliance systems for industrial facilities — obligation registers, calendars, evidence workflows, and monthly briefings, human-reviewed by an experienced EHS professional.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }}>
      <Script
        data-website-id="dfid_9mR9UuAjn866RWrU7V6mL"
        data-domain="greengptadvisory.com"
        src="https://datafa.st/js/script.js"
        strategy="afterInteractive"
      />
      <body className="bg-[#FAFAF4] text-gray-900 min-h-screen font-sans">
        <ThemeProvider disableTransitionOnChange forcedTheme="light">
          <NavigationMenu />
          <main>{children}</main>
          <footer className="px-6 py-8 border-t border-gray-200 text-sm text-gray-500 text-center">
            <p>© {new Date().getFullYear()} GreenGPT Advisory. Managed EHS compliance systems for industrial facilities.</p>
            <p className="mt-2 max-w-2xl mx-auto text-xs text-gray-400">
              GreenGPT assists qualified EHS professionals. Outputs are drafts until reviewed and approved.
              Not legal advice. Your organization remains the final decision owner.
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
