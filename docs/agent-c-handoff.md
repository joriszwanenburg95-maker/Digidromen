# Agent C handoff

## Wat is opgeleverd
- Een pure TypeScript state-laag onder `src/` met seed data, workflowtransities, mock CRM-sync, servicepartner-acties en localStorage-persistentie.
- Geen visuele componenten of routering; de API is bedoeld als integratiebasis voor Agent B en als testoppervlak voor Agent D.

## Belangrijke entrypoints
- `src/store/portal-store.ts`: `createPortalStore()` levert de centrale store.
- `src/contracts/`: Agent A contractbron voor domein, adapters, workflows en persistence.
- `src/data/contract-seed.ts`: contract-compatibele demo-seed inclusief 6 orders, 4 repairs, 3 donations.
- `src/data/selectors.ts`: rolgefilterde datasets voor de UI.
- `src/data/csv.ts`: CSV-export helpers voor rapportages.

## Integratie voor Agent B
- Gebruik `const store = createPortalStore()` als singleton.
- Lees state via `store.getSnapshot()` en koppel in React via `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)`.
- Gebruik `selectOrdersForRole`, `selectRepairsForRole`, `selectDonationsForRole` en `selectNotificationsForRole` voor rolgefilterde lijsten.
- Trigger statusupdates via:
  - `store.updateOrderStatus(...)`
  - `store.updateRepairStatus(...)`
  - `store.updateDonationStatus(...)`
  - `store.servicePartner.pushShipmentUpdate(...)`
  - `store.servicePartner.pushRepairUpdate(...)`
  - `store.servicePartner.pushRefurbishUpdate(...)`
  - `store.crm.retry(...)`
- CSV-download kan direct met `store.exportOrdersCsv()` en `store.exportRepairsCsv()`.

## Aannames
- De rolwissel bepaalt impliciet welke demo-gebruiker actief is; er is geen aparte auth-flow.
- Alle documentuploads zijn metadata-only placeholders.
- CRM-sync is deterministisch/fake en wordt via `queue`, `retry`, `flushQueue` en `markFailed` gedemonstreerd.
- Voorraadmutaties zijn pragmatisch gehouden voor demo’s, niet boekhoudkundig volledig.

## Demo-relevante seed records
- Orders: `order-1001` t/m `order-1006`
- Repairs: `repair-2001` t/m `repair-2004`
- Donations: `donation-3001` t/m `donation-3003`
- Queued CRM: `order-1002`
- Failed CRM: `repair-2001`
- Retrying CRM: `donation-3001`

## Testfocus voor Agent D
- Refresh moet `digidromen-poc-role`, `digidromen-poc-data` en `digidromen-poc-ui` intact houden.
- Elke transitie moet een `WorkflowEvent`, `Notification` en CRM-bufferwijziging toevoegen.
- Servicepartner-acties moeten zichtbaar doorwerken in detailtimelines en inventory.
