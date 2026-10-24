import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PageWrapper from "../../components/PageWrapper";
import {
  CONFORMANCE_TESTS,
  IMPLEMENTED_CONTROLS,
  SPEC_PUBLIC_PATH,
  SPEC_VERSION,
} from "@/lib/controls/specMeta";

export const metadata: Metadata = {
  title: "Agent control specification",
  description:
    "Technical control specification for GreenGPT industrial compliance agents: identity, authorization, revocation, audit, misuse, and conformance tests.",
};

export default async function ControlsPage() {
  const spec = await readFile(
    path.join(process.cwd(), "docs/controls/industrial-compliance-agent.md"),
    "utf8"
  );

  return (
    <PageWrapper title="">
      <section className="mx-auto max-w-3xl space-y-8 text-left">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Public control specification
          </p>
          <h1 className="text-3xl font-bold text-[#0B3D2E] sm:text-4xl">
            Industrial compliance agent controls
          </h1>
          <p className="text-lg leading-relaxed text-slate-700">
            Version {SPEC_VERSION}. The agent may identify, propose, and prepare. A named human must
            authorize anything consequential.
          </p>
          <p className="text-sm text-slate-600">
            Canonical document: <code className="text-xs">docs/controls/industrial-compliance-agent.md</code>{" "}
            · this page is {SPEC_PUBLIC_PATH}.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Implemented in this product
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-800">
            {IMPLEMENTED_CONTROLS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Control</th>
                <th className="px-4 py-3">Requirement</th>
              </tr>
            </thead>
            <tbody>
              {CONFORMANCE_TESTS.map((test) => (
                <tr key={test.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[#0B3D2E]">{test.id}</td>
                  <td className="px-4 py-3 text-slate-700">{test.control}</td>
                  <td className="px-4 py-3 text-slate-700">{test.requirement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <article className="prose prose-slate max-w-none prose-headings:text-[#0B3D2E] prose-a:text-emerald-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec}</ReactMarkdown>
        </article>

        <p className="text-sm text-slate-600">
          Workspace operators can review agent identity, approvals, and the action ledger in{" "}
          <Link href="/workspace" className="font-semibold text-[#0B3D2E] underline">
            the managed workspace
          </Link>
          .
        </p>
      </section>
    </PageWrapper>
  );
}
