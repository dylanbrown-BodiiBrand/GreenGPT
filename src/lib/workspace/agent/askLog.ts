import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveAgent, insertActionEvent } from "./persist";
import { normalizeSources } from "./ledger";
import type { SupportingSource } from "./types";

export async function logAskRetrieval(input: {
  supabase: SupabaseClient;
  organizationId: string;
  facilityId: string | null;
  question: string;
  answer: string;
  sources: SupportingSource[];
}): Promise<void> {
  try {
    const agent = await getActiveAgent(input.supabase, input.organizationId);
    if (!agent) return;
    await insertActionEvent(input.supabase, {
      organizationId: input.organizationId,
      runId: null,
      agentId: agent.id,
      proposalId: null,
      toolName: "search_approved_corpus",
      inputs: { question: input.question, facilityId: input.facilityId },
      supportingSources: normalizeSources(input.sources),
      proposedChange: {
        before: null,
        after: { reviewStatus: "draft", answer: input.answer.slice(0, 500) },
      },
      approvalStatus: "not_required",
      authorizedByUserId: null,
      authorizedByEmail: null,
      appliedEntityType: null,
      appliedEntityIds: [],
    });
  } catch (err) {
    console.warn("[agent.ask] ledger write skipped:", err instanceof Error ? err.message : err);
  }
}
