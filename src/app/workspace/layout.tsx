import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/requireSessionUser";
import { WorkspaceNav } from "./WorkspaceNav";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/workspace")}`);
  }

  return (
    <div className="min-h-screen bg-[#FAFDF7] text-[#1B2A22]">
      <div className="border-b border-[#E8E6E0] bg-[#0B3D2E] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6EE7B7]">
            Managed EHS Workspace
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">Facility compliance operating system</h1>
          <p className="text-sm text-white/70">
            Signed in as {user.email}. Outputs remain drafts until EHS review. Not legal advice.
          </p>
        </div>
      </div>
      <WorkspaceNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
