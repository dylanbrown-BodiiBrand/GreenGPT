# ARDR as a workspace export format

**ARDR** = Applicable Regulations & Document Review (facility compliance matrix).

## Positioning

| Artifact | Role |
|----------|------|
| **Managed EHS Workspace** | **System of record** — obligation status, evidence, CAPs, review states, audit trail |
| **ARDR .xlsx** | **Export / handoff format** — diagnostic workshop scaffold, client pack, inspection binder snapshot |
| **Blank ARDR template** | Applicability workshop starting point (program-area tabs). Does not replace live tracking |

Do **not** treat a downloaded spreadsheet as the master for status, evidence, or corrective actions. Update those in the workspace, then re-export.

## Where it lives in product

- Blank template: `/templates/GreenGPT-ARDR-Facility-Template.xlsx` (also under `templates/` in repo)
- Live snapshot export: `GET /api/workspace/ardr/export?facilityId=…`
- Pilot sample: `GET /api/workspace/ardr/export?preview=1`
- UI: Workspace → Obligations → **ARDR export**

## Export contents

1. **Cover** — facility meta + explicit “workspace is system of record” guidance  
2. **Obligation Register** — ARDR columns filled from workspace obligations  
3. **CAPs (workspace)** — corrective-action snapshot  
4. **Evidence (workspace)** — evidence-item snapshot  

## Diagnostic vs managed

- **Diagnostic:** blank/scaffolded ARDR + preliminary register; load applicable rows into workspace for ongoing work  
- **Managed:** maintain register/CAPs/evidence in workspace; export ARDR when the client needs a spreadsheet pack
