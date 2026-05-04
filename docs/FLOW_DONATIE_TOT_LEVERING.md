# Digidromen Portal — Flow van Donatie tot Levering

Laatste update: 2026-05-04

Dit document beschrijft de operationele keten in de actuele portal.

## Rollen in de flow

| Rol | Functie in flow |
|---|---|
| `help_org` | Vraagt laptops/vervangingen aan en volgt eigen aanvragen. |
| `digidromen_staff` | Coördineert, accordeert, plant en beheert operationele data. |
| `digidromen_admin` | Alles van staff plus gebruikers, audit en technische beheerfuncties. |
| `service_partner` | Verwerkt donaties, voorraad, locaties en uitleveringen. |

## 1. Donatiebatch: donor naar warehouse

Donaties zijn operationeel zichtbaar voor Digidromen en servicepartner, niet voor hulporganisaties.

| Fase | Status | Wie handelt af | UI |
|---|---|---|---|
| Registratie | `aangemeld` | staff/admin | Donaties |
| Pickup plannen | `pickup_gepland` | staff/admin of toegewezen servicepartner | Donatie-detail |
| Ontvangst | `ontvangen` | toegewezen servicepartner/staff | Donatie-detail |
| Verwerking | `in_verwerking` | toegewezen servicepartner/staff | Donatie-detail |
| Klaar | `verwerkt` | toegewezen servicepartner/staff | Donatie-detail |

Bij statuswijzigingen schrijft de app een `workflow_events` rij met `case_type = donation`.

## 2. Voorraad

Donaties vullen operationeel de voorraad aan. De portal heeft geen harde 1-op-1 FK tussen donatiebatch en order.

Belangrijke tabellen:
- `inventory_items`
- `inventory_movements`
- `stock_locations`
- `products`

Servicepartner ziet voorraad als werkvoorraad. Staff/admin ziet totaaloverzicht.

## 3. Bestelling / aanvraag

Voor hulporganisaties heet dit in de UI bij voorkeur **Aanvraag**. Intern heet de tabel `orders`.

| Fase | Status | Wie |
|---|---|---|
| Concept | `concept` | wizard/autosave |
| Ingediend | `ingediend` | hulporganisatie of Digidromen namens organisatie |
| Ter accordering | `te_accorderen` | staff/admin |
| Geaccordeerd | `geaccordeerd` | staff/admin |
| Voorbereiding | `in_voorbereiding` | staff/admin/servicepartner |
| Geleverd | `geleverd` | servicepartner/staff |
| Afgesloten | `afgesloten` | staff/admin |
| Afgewezen | `afgewezen` | staff/admin |

Product- en RMA-regels staan in:

`portal/src/lib/productRules.ts`

Workflowregels staan in:

`portal/src/lib/workflow.ts`

## 4. Realtime

Realtime invalideert TanStack Query keys.

Belangrijk:
- `help_org` hoort alleen eigen orderwijzigingen te volgen.
- Operationele streams zoals donaties, voorraad, notificaties en workflow-events zijn voor servicepartner/staff/admin.

## 5. Dashboard

Dashboard is rolafhankelijk:
- `help_org`: klantstartpagina met eigen aanvragen en CTA naar nieuwe aanvraag.
- `service_partner`: werkvoorraad/warehouse taken.
- `digidromen_staff/admin`: regie-dashboard met accordering, signalen en open operationele dossiers.

Zie ook:

`docs/2026-05-04-ui-ux-role-spec.md`
