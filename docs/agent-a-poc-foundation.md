# Digidromen Supply & Service Portal PoC

## Agent A Scope

This document translates the PDF requirements into a frontend-only proof-of-concept scope for a localhost demo. It is decision-complete for Agent B (UI), Agent C (state and flow), and Agent D (QA/demo) and intentionally excludes production auth, backend integrations, and visual implementation.

## Requirements Mapping

| Requirement Area | PDF Intent | PoC Translation | Acceptance Criteria |
| --- | --- | --- | --- |
| Bestellingen | Productcatalogus, aanvraag, statusvolging, pick/uitleveroverzicht | `/orders` list, `/orders/:id` detail, create form, stock badges, timeline, role-based status actions | User can create order, see timeline, and role-specific actors can move status through allowed transitions |
| Reparaties | Serienummer, foto’s, toelichting, reparatierapport, statusflow | `/repairs` list, `/repairs/:id` detail, create form, accessory subtype, repair timeline, report placeholder | User can submit repair, view subtype and attachments metadata, and progress repair via allowed transitions |
| Donaties | Registratie, ophalen, refurbishing, voorraadimpact | `/donations` list, `/donations/:id` detail, pickup planning, refurbish result, stock impact | Donation batch can be registered, updated by service partner, and reaches stock-ready state with timeline trace |
| Dashboard | Role-based overview and KPI monitoring | `/dashboard` with persona-specific cards, alerts, pending actions, recent docs | Dashboard content changes with role and reflects current mocked data |
| Communicatie | Per aanvraag chat and notifications | Embedded case timeline/messages and global notification center | Every case detail shows messages and system events; status changes create mock notifications |
| Documentbeheer | Upload/download linked to aanvragen | Metadata-only document widgets on case detail pages | Documents can be attached as metadata and linked to orders, repairs, or donations |
| Rapportages | CSV export and operational tables | `/reports` tables with export actions for orders, repairs, donations, inventory | Export action yields valid CSV for at least orders and repairs |
| CRM-integratie | CRM-onafhankelijk, async, retry, buffering | `/crm-sync` panel with queue, synced, failed, retrying, buffered changes | Records expose CRM references and mock sync states can fail and retry |
| Rollen en toegang | Role-based tasks and visibility | Header role switcher, navigation filtering, page-level action gating | Switching role changes visible navigation, dashboard panels, and allowed mutations |

## Route Map

| Route | Purpose | Primary Roles | Key Modules |
| --- | --- | --- | --- |
| `/login` | Demo landing with persona select | All | Persona selection, mocked sign-in |
| `/dashboard` | Role-based operational overview | All | KPIs, pending actions, documents, sync health |
| `/orders` | Orders list and creation entry point | All | Catalog, filters, create order, list states |
| `/orders/:id` | Order detail workflow view | All | Timeline, communication, documents, status actions |
| `/repairs` | Repairs list and creation entry point | All | Repair request, filters, subtype visibility |
| `/repairs/:id` | Repair detail workflow view | All | Timeline, diagnostics, replacement flow, docs |
| `/donations` | Donations list and registration entry point | Digidromen, Servicepartner | Donation intake, pickup planning, stock outcome |
| `/donations/:id` | Donation workflow detail | Digidromen, Servicepartner | Refurbish result, timeline, stock impact |
| `/inventory` | Inventory overview and mutations | Digidromen, Servicepartner | Stock levels, reservations, mutations |
| `/reports` | Reporting and export stubs | Hulporganisatie, Digidromen admin/staff | Tables, CSV export, KPI snapshots |
| `/settings` | Config stubs for products, statuses, users | Digidromen admin, Hulporganisatie beheer-like needs via scoped panels if added later | Settings stubs only |
| `/crm-sync` | Mock integration operations center | Digidromen staff/admin | Queue, retry, last sync, failure reason |

## Role Matrix

| Capability | help_org | digidromen_staff | digidromen_admin | service_partner |
| --- | --- | --- | --- | --- |
| Switch into role from header | Yes | Yes | Yes | Yes |
| View own dashboard | Yes | Yes | Yes | Yes |
| Create order | Yes | No | No | No |
| Review/reject/prioritize order | No | Yes | Yes | No |
| Push shipment update | No | No | No | Yes |
| Create repair request | Yes | Yes | Yes | No |
| Update repair workflow | Limited to submit/follow | Yes | Yes | Yes |
| Register donation batch | No | Yes | Yes | Limited update only |
| Plan pickup / refurbish / stock impact | No | Yes | Yes | Yes |
| Upload documents to linked case | Yes | Yes | Yes | Yes |
| View CRM sync center | No | Yes | Yes | No |
| Manage products/workflow/report settings stubs | No | No | Yes | No |
| Export reports | Own history only | Yes | Yes | No |

Notes:
- `help_org` represents external help organization users in the PoC. Organization-local user management is intentionally reduced to settings stubs.
- `digidromen_admin` extends `digidromen_staff` permissions with configuration and reporting scope.
- `service_partner` can update fulfillment, repair, refurbish, and inventory-impact events but cannot create new partner-independent business cases.

## Workflow Matrix

### Orders

| Status | Meaning | Allowed Next States | Typical Actor |
| --- | --- | --- | --- |
| `INGEDIEND` | Request submitted by help organization | `BEOORDEELD`, `GEANNULEERD` | help_org to create, digidromen to review |
| `BEOORDEELD` | Request checked and accepted for processing | `IN_BEHANDELING`, `GEANNULEERD` | digidromen_staff/admin |
| `IN_BEHANDELING` | Operational handling started | `IN_VOORBEREIDING`, `GEANNULEERD` | digidromen_staff/admin |
| `IN_VOORBEREIDING` | Picking and prep in progress | `VERZONDEN`, `GEANNULEERD` | digidromen_staff/admin |
| `VERZONDEN` | Shipment is on the way | `GELEVERD` | service_partner |
| `GELEVERD` | Delivered to organization | `AFGESLOTEN` | service_partner or digidromen confirmation |
| `AFGESLOTEN` | Workflow closed | none | digidromen_staff/admin |
| `GEANNULEERD` | Workflow canceled | none | help_org before handling, digidromen thereafter |

### Repairs

| Status | Meaning | Allowed Next States | Typical Actor |
| --- | --- | --- | --- |
| `ONTVANGEN` | Repair request received | `DIAGNOSE`, `IRREPARABEL` | help_org creates, digidromen/service partner triages |
| `DIAGNOSE` | Root cause under review | `IN_REPARATIE`, `IRREPARABEL` | digidromen_staff/service_partner |
| `IN_REPARATIE` | Repair or replacement action in progress | `TEST`, `IRREPARABEL` | service_partner |
| `TEST` | Device or accessory validation | `RETOUR`, `IRREPARABEL` | service_partner |
| `RETOUR` | Return shipment to organization arranged/completed | `AFGESLOTEN` | service_partner or digidromen |
| `IRREPARABEL` | Cannot be repaired; replacement or closure path | `AFGESLOTEN` | digidromen_staff/admin |
| `AFGESLOTEN` | Case closed | none | digidromen_staff/admin |

Accessory issue subtype:
- subtype `ACCESSORY_ISSUE` uses the same main repair statuses.
- In `DIAGNOSE` or `IN_REPARATIE`, a replacement action can be logged instead of a repair action.

### Donations

| Status | Meaning | Allowed Next States | Typical Actor |
| --- | --- | --- | --- |
| `TOEGEZEGD` | Donation promised by sponsor/company | `OPHAALAFSPRAAK_GEPLAND` | digidromen_staff/admin |
| `OPHAALAFSPRAAK_GEPLAND` | Pickup scheduled | `OPGEHAALD` | service_partner |
| `OPGEHAALD` | Devices collected | `AANGEKOMEN_WAREHOUSE` | service_partner |
| `AANGEKOMEN_WAREHOUSE` | Batch received in warehouse | `IN_VERWERKING` | service_partner/digidromen |
| `IN_VERWERKING` | Refurbishment and intake in progress | `RAPPORTAGE_GEREED` | service_partner |
| `RAPPORTAGE_GEREED` | Refurbish result and counts known | `OP_VOORRAAD` | service_partner/digidromen |
| `OP_VOORRAAD` | Devices available as stock | none | digidromen_staff/admin |

## Persistency Contract

Stable localStorage keys:

- `digidromen-poc-role`
- `digidromen-poc-data`
- `digidromen-poc-ui`

Rules:

1. `digidromen-poc-role` stores the active persona as a single `Role` string.
2. `digidromen-poc-data` stores the normalized portal dataset, seeded on first load and replaced on each committed mutation.
3. `digidromen-poc-ui` stores non-domain UI state only, such as selected filters, open panels, active tab per route, and dismissed notifications.
4. Seed load must be idempotent: if stored data is missing or malformed, the app rehydrates from the seed dataset and logs a recoverable warning.
5. Workflow mutations append timeline events before persistence completes so refresh preserves auditability.
6. CRM sync buffering must be stored in `digidromen-poc-data`, not `digidromen-poc-ui`, because it is domain state.
7. Exported CSV files are transient browser downloads and are not persisted.

## Integration Contract Summary

Contract files live under `src/contracts/`:

- `domain.ts`: core entity types, statuses, normalized store shape, dashboard views
- `navigation.ts`: route metadata, navigation groups, role visibility rules
- `workflows.ts`: status transition maps, role permissions, helper types
- `adapters.ts`: portal store, CRM mock adapter, service partner adapter, seed factory contracts
- `persistence.ts`: localStorage keys, persistence envelope, parse/rehydration contract

## Handoff Notes

### Agent B

- Build against `src/contracts/domain.ts`, `navigation.ts`, and `workflows.ts`.
- Keep pages thin: consume status metadata and role gating from contracts instead of duplicating logic in components.
- Use `RouteDefinition.navLabel` and `RouteDefinition.visibleTo` as the primary navigation source.
- Each detail page should render the same shared modules: summary header, status chip, timeline, communication feed, documents, and CRM sync summary.

### Agent C

- Implement the normalized `PortalData` shape exactly as defined in `domain.ts`.
- Store mutations must go through the transition contracts in `workflows.ts`; do not hardcode arbitrary next states.
- Simulate CRM failures via `CrmSyncJob` state and preserve buffered field-level changes for retry.
- Seed data must cover every route with immediate content, including at least one failed CRM sync item and at least one accessory repair subtype.

### Agent D

- Use the acceptance criteria in the requirements mapping as the baseline checklist.
- Validate that role switch affects navigation, list content, allowed actions, and dashboard composition.
- Confirm refresh persistence for role, data, and UI preferences separately.
- Demo script should cover one order, one repair, one donation, and one failed CRM sync retry.
