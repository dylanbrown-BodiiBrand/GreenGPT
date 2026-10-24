# GreenGPT Industrial Compliance Agent — Technical Control Specification

**Spec ID:** `greengpt-industrial-compliance-agent`  
**Version:** 1.2.0  
**Status:** Normative for GreenGPT Advisory managed workspace agents  
**Public surface:** `/controls`  
**Conformance suite:** `src/lib/workspace/agent/__tests__/conformance.test.ts` (ICA-01–ICA-17)

Language in this document uses RFC 2119 keywords: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

---

## 1. Purpose and non-goals

### 1.1 Purpose

This specification defines identity, authorization, revocation, autonomy, and audit controls for an **industrial compliance agent** that assists Environment, Health, and Safety (EHS) work inside GreenGPT’s managed workspace.

The agent exists to:

- identify compliance deadlines from the facility obligation register;
- propose obligation register rows from a human-completed ARDR worksheet;
- propose corrective-action tasks;
- prepare draft records (inspection prep, monthly briefing);
- request human approval before any consequential write.

These controls make a non-negotiable operating rule **enforceable in software**: GreenGPT assists qualified EHS professionals; it does not replace them. Outputs remain drafts until a named human reviews and approves them. This is not legal advice. The client organization remains the final decision owner.

### 1.2 Non-goals

The agent **MUST NOT**:

- operate as unsupervised autonomy or a free-running loop that writes the obligation register;
- provide legal advice or final applicability determinations;
- send email or regulator-facing communications;
- mark records `approved` or close corrective actions;
- treat a shared job secret (`CRON_SECRET`) as an agent identity;
- be marketed as a chatbot-as-product.

Dedicated compute instances, extra tenant isolation, and customer-specific retention are **out of scope** of the baseline controls unless configured for an engagement.

---

## 2. Identity model

Every action in the workspace **MUST** be attributable to a verified principal.

### 2.1 Human principals

Customer-facing job functions:

| Job function | Maps from current org role | Authority |
|---|---|---|
| **EHS manager** | `owner`, `admin` | Org-wide. Manage and revoke agents. Approve or deny proposals. Provision users. |
| **Facility administrator** | `editor` | Approve or deny proposals for facilities in scope. Cannot revoke an org-wide agent. Cannot provision agents. |
| **Employee** | `viewer` | Read workspace records and submit evidence. **MUST NOT** approve agent proposals or manage agents. |

Internal compatibility: existing `organization_members.role` values remain the stored role. Job function **MUST** be derived by the mapping above so live organizations do not break.

GreenGPT Advisory operator access (email allowlist) is a **separate** staff identity. It is not a customer job function and **MUST NOT** be used as the agent principal.

### 2.2 Agent principal

An AI agent **MUST** be a first-class principal, not a human membership row and not the signed-in user who clicked “Ask.”

Each agent record **MUST** include:

- unique `agent_id`
- `organization_id`
- display name
- `status`: `active` \| `suspended` \| `revoked`
- `delegated_by` (human who authorized the agent’s existence)
- facility scope (`facility_ids`, or all facilities in the org)
- granted capabilities
- revocation metadata (`revoked_at`, `revoked_by`, `revoke_reason`) when revoked

### 2.3 Forbidden identities

The following **MUST NOT** be accepted as an agent principal:

- a shared cron or ingestion secret;
- an anonymous session;
- a principal from another organization;
- a revoked or suspended agent row.

---

## 3. Authorization

### 3.1 Capabilities

An agent **MAY** be granted only these capabilities:

| Capability | Allowed effect without human approval |
|---|---|
| `identify_deadlines` | Read obligations and emit deadline-alert **proposals** |
| `propose_tasks` | Draft corrective-action **proposals** |
| `prepare_records` | Draft inspection-prep and briefing **proposals** |
| `populate_register` | Draft obligation **proposals** from a human-completed ARDR worksheet (§3.5) |
| `request_approval` | Place proposals on the human approval queue |

A missing grant **MUST** fail closed.

### 3.2 Every automated action

Before an automated action proceeds, the control plane **MUST** verify:

1. Actor is a verified `workspace_agents` row (not the clicking human, not `CRON_SECRET`).
2. Agent `status` is `active`.
3. The required capability is granted.
4. The target facility is inside the agent’s scope and the same organization.
5. Any consequential effect is blocked unless a later human approval record exists.

### 3.3 Delegated authority

Creating an agent is a delegation from an EHS manager to a named agent. Delegation **MUST** be recorded (`delegated_by`). Facility administrators **MUST NOT** create or revoke org-wide agents.

Humans **MAY** trigger a run. Triggering a run is not approval of the run’s proposals.

### 3.4 What an agent MUST NOT do

An agent **MUST NOT**:

- set `review_state` to `approved`, or set an obligation `status` to `approved` or `completed`;
- close a corrective action;
- set or change regulatory applicability (applicability comes only from the human-completed ARDR `Applies?` column; §3.5);
- send email or any external communication;
- write across facilities or organizations;
- approve its own proposal;
- persist a consequential record except via an approved proposal apply path.

### 3.5 Register population

The agent **MAY** populate the obligation register only by proposing rows from an ARDR worksheet that a human uploaded for a single facility. The control plane **MUST**:

- propose only rows whose `Applies?` is `Yes` or `TBD`; rows marked `No` or left blank **MUST NOT** become proposals (ICA-16). They remain documented in the ARDR file;
- refuse an obligation proposal that has no citation or no ARDR source row (ICA-13);
- persist an approved obligation with `status` and `review_state` both `draft` (ICA-14). Approval by a named human accepts the row into the register; it does not approve the obligation;
- reject a proposal that duplicates a pending proposal or an existing register row for the same facility, citation, and requirement (ICA-15);
- bound each import run to a fixed maximum number of proposals.

### 3.6 Retrieval tenancy

The indexed corpus has two tiers: a **shared library** (federal and state rules, EHS reference material) with no organization, and **client documents** tagged with an `organization_id` and optionally a `facility_id`. Retrieval for Ask and for any agent tool **MUST**:

- filter by organization inside the search query, so another organization's chunks are never candidates;
- return a client document only to its own organization, and only for its facility when the document is facility-tagged;
- return a client document only when it is linked to a workspace document with `approval_status = approved`;
- return only the shared library when the requester has no organization membership;
- re-check the same rules on the returned rows before they reach the model (ICA-17).

The search function **MUST NOT** be executable by `anon` or `authenticated` roles; only the server may call it.

---

## 4. Revocation

An EHS manager **MUST** be able to revoke or suspend an agent immediately.

On revocation the control plane **MUST**:

- set `status` to `revoked` (or `suspended`);
- record `revoked_at`, `revoked_by`, and `revoke_reason`;
- cancel in-flight runs that have not yet applied writes;
- refuse subsequent `startRun` and tool calls (ICA-01);
- append a ledger event for the revocation.

Revocation **MUST NOT** delete historical ledger rows. Credentials or grants for a revoked agent **MUST NOT** remain usable.

---

## 5. Autonomy levels

| Level | Agent may | Human required |
|---|---|---|
| **Read** | Inspect in-scope register, evidence, approved corpus | No |
| **Propose / prepare** | Create draft proposals with sources and a diff | No |
| **Apply** | Persist a workspace entity | **Yes — named human approval** |
| **Approve / close / communicate externally** | Never | Human only; agent **MUST NOT** |

Scheduled (unattended) runs **SHOULD** remain disabled until revocation and audit have been proven in production. Baseline runs **MUST** be human-started from the workspace (Ask, Overview, or Approvals).

Ask GreenGPT Q&A remains a **draft retrieval** path. It **MUST** be logged to the agent ledger and **MUST NOT** mark answers approved.

---

## 6. Audit requirements

### 6.1 Ledger

`workspace_audit_events` remains the human change log.

Agent activity **MUST** be recorded in an append-only ledger:

- `agent_runs` — workflow: who/what started the run, agent, trigger, status
- `agent_action_events` — immutable events
- `agent_proposals` — approval workflow objects (status may change; the ledger events for those changes are append-only)

Updates to `agent_action_events` **MUST NOT** be permitted. Compensating facts **MUST** be new events.

### 6.2 Minimum fields on each agent action event

| Field | Purpose |
|---|---|
| `agent_id` | Verified agent identity |
| `authorized_by` | Human principal; null until a decision |
| `tool_name` / tools used | Ordered tool call |
| `supporting_information` | Sources, citations, retrieval scores |
| `proposed_change` | Before/after or patch |
| `approval_status` | `pending` \| `approved` \| `denied` \| `expired` \| `not_required` |
| `applied_entity_ids` | What actually changed (empty if none) |

An apply event **MUST** be dual-actor: **agent proposed**, **human authorized**.

An event missing tools or supporting information **MUST** fail conformance (ICA-10). Read-only retrieval **MUST** still record the tool name and the sources used (or an explicit empty-sources object when declined).

### 6.3 Retention and visibility

Members of the organization **MUST** be able to read the agent ledger in `/workspace/audit`. Retention beyond the engagement **SHOULD** follow the customer agreement. Export **MAY** be added later; absence of export does not relax completeness of stored events.

---

## 7. Misuse scenarios and required mitigations

| ID | Scenario | Required mitigation |
|---|---|---|
| M-01 | Agent marks a record `approved` | Payload and apply path reject `review_state=approved` and CAP `closed` (ICA-03) |
| M-02 | Revoked or suspended agent continues to act | Status check on every run and tool (ICA-01) |
| M-03 | Stolen or leaked agent credential used across orgs | Agent is org-scoped; cross-org acts fail (ICA-09) |
| M-04 | Prompt injection via an uploaded “approved” document | Agent writes only as proposals; apply cannot set approved; Q&A cannot self-approve |
| M-05 | Cross-facility leakage | Facility scope on the agent; tools filter by facility (ICA-08) |
| M-06 | Employee impersonates an EHS manager to approve | Job-function check; employees cannot approve (ICA-04) |
| M-07 | Agent opens an unbounded CAP loop | Duplicate pending keys rejected; max proposals per run (ICA-12) |
| M-08 | Human rubber-stamps without sources or diff | Approval UI **MUST** show sources and diff; ledger **MUST** store them; incomplete events fail ICA-10 |
| M-09 | Agent sends email or regulator-facing output | No send-email tool; external communication capability does not exist |
| M-10 | Shared job secret used as agent identity | `shared_secret` actor kind **MUST** be rejected (ICA-11) |
| M-11 | Agent invents obligations without a regulatory basis | Obligation proposals without citation and ARDR source are refused (ICA-13) |
| M-12 | Agent imports requirements the client marked not applicable | `No` and blank `Applies?` rows never become proposals (ICA-16) |
| M-13 | Repeated imports flood the register | Duplicate facility + citation + requirement is rejected (ICA-15); per-run cap |
| M-14 | One client's documents ground another client's answer | Organization filter inside the search query plus a row re-check (ICA-17) |
| M-15 | An unapproved client document grounds an answer | Client documents are retrievable only when linked to an approved workspace document (ICA-17) |

---

## 8. Conformance tests

The following tests are **machine-checkable** and **MUST** remain green in `src/lib/workspace/agent/__tests__/conformance.test.ts`.

| ID | Name | Requirement |
|---|---|---|
| ICA-01 | revoked-or-inactive-agent-cannot-run | Suspended or revoked agent cannot start a run |
| ICA-02 | missing-capability-cannot-propose | Agent without `propose_tasks` cannot create a CAP proposal |
| ICA-03 | agent-cannot-mark-approved | Agent cannot persist `approved` or close a CAP |
| ICA-04 | employee-cannot-approve | Employee cannot approve or deny |
| ICA-05 | agent-cannot-self-approve | Agent cannot approve its own proposal |
| ICA-06 | denied-proposal-writes-nothing | Denied proposal leaves no entity write |
| ICA-07 | approved-proposal-dual-actor-audit | Approved apply records agent + human, tools, and sources |
| ICA-08 | facility-scope-isolation | Facility-scoped agent cannot read/write another facility |
| ICA-09 | cross-organization-isolation | Agent cannot act in another organization |
| ICA-10 | audit-completeness | Event missing tools or supporting information fails |
| ICA-11 | shared-secret-is-not-an-agent | `CRON_SECRET` / shared_secret is not an agent |
| ICA-12 | unbounded-proposal-loop-blocked | Duplicate pending proposal for same finding+facility is rejected |
| ICA-13 | unsourced-obligation-refused | Obligation proposal without citation or ARDR source is refused |
| ICA-14 | approved-obligation-lands-draft | Approved obligation persists with `status` and `review_state` `draft` |
| ICA-15 | duplicate-obligation-rejected | Same facility + citation + requirement as a pending proposal or register row is rejected |
| ICA-16 | non-applicable-row-not-imported | ARDR rows marked `No` or blank never become proposals |
| ICA-17 | retrieval-tenant-isolation | Retrieval returns the shared library plus only the requester's own approved, in-facility client documents |

---

## 9. Implementation mapping

How GreenGPT satisfies each control in this repository:

| Control | Implementation |
|---|---|
| Identity | `organization_members.role` mapped in `src/lib/workspace/roles.ts`; agents in `workspace_agents` |
| Authorization | `src/lib/workspace/agent/authorization.ts` — fail-closed capability, scope, and job-function checks |
| Revocation | `revokeAgent` sets status, cancels in-flight runs, appends a ledger event |
| Autonomy | Tools in `src/lib/workspace/agent/tools.ts` emit proposals only; apply requires `/workspace/approvals` |
| Audit | `agent_runs` + `agent_action_events`; UI at `/workspace/audit` |
| Register population | `src/lib/workspace/ardrImport.ts` parses the ARDR; `import_ardr` tool proposes obligations; upload at `/api/workspace/ardr/import` |
| Retrieval tenancy | `match_chunks_scoped` SQL function (server-only); row re-check in `src/lib/workspace/agent/retrieval.ts`; ingestion tags organization and facility |
| Misuse | Conformance ICA-01–ICA-17; no email tool; proposal caps and duplicate keys |
| Public contract | This document and `/controls` |

Shared cron authentication remains an **internal job secret** until a later phase replaces it with a named internal agent. It **MUST NOT** be presented as the compliance agent.

---

## 10. Claims discipline

Public marketing **MUST NOT** claim “complete audit trails” or “formal enterprise RBAC” beyond what this specification’s conformance suite currently verifies.

GreenGPT **MAY** claim that:

- agent identity, authorization, revocation, and agent-action audit are defined by this specification at version 1.2.0;
- consequential agent writes require a named human approval;
- the named conformance tests ICA-01–ICA-17 are the acceptance criteria.

Dedicated instances and additional isolation remain engagement-specific configuration.
