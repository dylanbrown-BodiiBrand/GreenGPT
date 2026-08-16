# ARDR — diagnostic worksheet, structured input, and export

**ARDR** = Applicable Regulations & Document Review (facility compliance matrix).

## Three layers (do not collapse these)

| Stage | Artifact | Role |
|-------|----------|------|
| **Before sale** | Web form at `/intake` | **Commercial / scoping intake only** — contact, site profile, permits/hazards, goals. **Do not require ARDR to request a diagnostic.** Blank ARDR may be offered as an optional preview for serious buyers. |
| **Paid diagnostic** | Filled ARDR workbook | **Required working product** — contractor + client set Applies?, evidence notes, owners, gaps. Structured input that seeds the obligation register and calendar. Returnable mid-engagement (“send completed ARDR + redacted docs”). |
| **Managed / ongoing** | Managed EHS Workspace | **System of record** for status, evidence, CAPs, review states, audit trail. |
| **Anytime after load** | ARDR `.xlsx` export | **Snapshot / handoff format** — client pack, walkdown binder, findings appendix. Re-export from workspace; do not chase live work only in the spreadsheet. |

## What ARDR is not

- Not a second public lead-gen form competing with `/intake`
- Not the live master for status, evidence, or corrective actions
- Not legal advice or a substitute for Client applicability ownership

## Product surfaces

| Surface | Purpose |
|---------|---------|
| `/intake` | Light commercial intake; optional blank ARDR download |
| `/templates/GreenGPT-ARDR-Facility-Template.xlsx` | Blank scaffold (diagnostic workshop / serious-buyer preview) |
| Workspace → Obligations → ARDR export | Live snapshot from workspace records |
| `GET /api/workspace/ardr/export?facilityId=…` | Authenticated facility export |
| `GET /api/workspace/ardr/export?preview=1` | Sample pilot workbook |

## Diagnostic flow (target operating model)

1. Client submits **web intake** (qualify + scope).  
2. Principal confirms fee/scope → paid **Facility Compliance Diagnostic**.  
3. Contractor issues blank or pre-seeded **ARDR**; client/contractor complete Applies? and yellow columns.  
4. Findings call uses ARDR + calendar + gaps; Client owns final applicability.  
5. Applicable rows load into **workspace** obligation register.  
6. Managed phase: update status / evidence / CAPs **in workspace**; export ARDR when a spreadsheet pack is needed.

## Export workbook contents (managed snapshot)

1. **Cover** — facility meta + SoR guidance  
2. **Obligation Register** — ARDR columns from workspace obligations  
3. **CAPs (workspace)** — corrective-action snapshot  
4. **Evidence (workspace)** — evidence-item snapshot  
