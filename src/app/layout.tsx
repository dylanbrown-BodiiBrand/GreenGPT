import type { Metadata } from "next";
import "./globals.css";
import NavigationMenu from "./components/navigationmenu";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "The Green Executive Briefing",
  description: "Helping businesses navigate green accounting with confidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
    lang="en" 
    data-theme="light"
    style={{ colorScheme: "light" }}
    >
      <body className="bg-[#FAFAF4] text-gray-900 min-h-screen font-sans">
      <ThemeProvider
          disableTransitionOnChange
          forcedTheme="light"
        >
          <NavigationMenu />
        <main>{children}</main>
        <footer className="px-6 py-8 border-t border-gray-200 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} The Green Executive Briefing.
        </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
