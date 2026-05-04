# Digidromen Documentatie

Laatste update: 2026-05-04

## Actuele bronnen

| Document | Doel |
|---|---|
| `../AGENTS.md` | Actuele projectcontext voor agents en vervolgwerk. |
| `../DESIGN.md` | Digidromen design system en huisstijl. |
| `DATA_MODEL_ARCHITECTURE.md` | Actueel datamodel, RLS-afspraken en frontend data-laag. |
| `FLOW_DONATIE_TOT_LEVERING.md` | Operationele flow van donatie, voorraad en bestelling. |
| `SUPABASE_MIGRATIES_SERVICEPARTNER.md` | Supabase project, migraties, RLS/login aandachtspunten. |
| `2026-05-04-ui-ux-role-spec.md` | Rolgerichte UI/UX-specificatie en implementatieprompt. |
| `2026-05-04-shadcn-ui-implementation-plan.md` | shadcn/ui foundation, fases en componentstrategie voor de portal. |

## Verwijderd als bron van waarheid

De oude handoffs en historische faseplannen zijn verwijderd. Ze waren nuttig als werkmateriaal, maar bevatten inmiddels verouderde aannames en oude implementatiedetails.

## Regels

- Geen secrets in docs.
- Geen service role keys, anon keys, DB passwords of access tokens opnemen.
- Hulporganisaties zijn klantgebruikers; servicepartner en Digidromen zijn operationele gebruikers.
- Dit project is Vite/React SPA, geen Next.js.
- De portal heeft per rol een andere UI-surface in dezelfde codebase: hulporganisatie als aanvraagportaal, servicepartner als werkvoorraad en Digidromen staff/admin als operations cockpit.
