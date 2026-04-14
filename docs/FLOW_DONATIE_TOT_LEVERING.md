# Flow: donatie → voorraad → levering (portal)

**Laatste update:** 2026-04-14  

Dit document beschrijft welke stappen het systeem ondersteunt en **waar** je ze in de UI en logs ziet.

## 1. Digidromen kan altijd bestellen

- Logica staat in `portal/src/lib/canPlaceOrder.ts`: **`digidromen_staff`** en **`digidromen_admin`** slagen altijd voor het bestelvenster.
- `Orders.tsx` en wizard stap **Bevestigen** (`StepConfirm.tsx`) gebruiken dezelfde functie.

## 2. Donatiebatch (donor → warehouse)

| Fase | Status (`donation_batches`) | Wie | Waar in UI |
|------|-----------------------------|-----|------------|
| Registratie | `aangemeld` | Staff/admin | Donaties → nieuwe batch; detailpagina |
| Ophaal plannen | `pickup_gepland` (+ `pickup_date`) | Staff / toegewezen servicepartner | Donatie-detail, statusknoppen |
| Ontvangen | `ontvangen` | Idem | Idem |
| Verwerken | `in_verwerking` | Idem | Idem |
| Klaar | `verwerkt` | Idem | Vereist o.a. certificaat (DB-trigger) |

**Log / tijdlijn:** Bij elke statusknop schrijft `DonationDetail` een rij in **`workflow_events`** (`case_type: donation`). Die verschijnen op:

- **Donatie-detail** → tab Status / tijdlijn
- **Dashboard** → *Recente activiteit* (laatste 6 events, gemengd met orders)

Na registratie van een **nieuwe** batch schrijft `Donations.tsx` ook een initiële `workflow_events`-rij (*Donatie aangemeld*).

## 3. Bestelling (hulporganisatie / namens org)

| Fase | Status (`orders`) | Wie | Waar |
|------|-------------------|-----|------|
| Concept | `concept` | Wizard | Lokaal concept-id; DB bij autosave |
| Ingediend | `ingediend` | Klant of Digidromen | Na wizard: `useOrderDraft.submitDraft` + **workflow event** *Bestelling ingediend* |
| Accordering | `te_accorderen` → `geaccordeerd` / `afgewezen` | Staff/admin | `OrderDetail` |
| Uitvoering | `in_voorbereiding` | Staff/admin | Idem |
| Levering | `geleverd` | Servicepartner / staff | Idem; optioneel voorraadmutatie `inventory_movements` |
| Afsluiten | `afgesloten` | Staff/admin | Idem |

**Log:** Orderstatuswijzigingen in `OrderDetail` → `workflow_events` (`case_type: order`). Dashboard toont de titelregel van het event (bijv. *Status gewijzigd naar …*).

## 4. Dashboard vs audit

- **Dashboard › Recente activiteit:** `workflow_events`, laatste 6, alle `case_type`-waarden. Wordt ververst na mutaties (invalidate + optioneel Realtime).
- **Audit Log:** aparte tabel **`audit_log`** (DB-triggers op mutaties) — technischer spoor, niet hetzelfde als de zakelijke tijdlijn per zaak.

## 5. Realtime

`portal/src/lib/realtime.ts` invalideert bij wijzigingen op **`workflow_events`**, zodat het dashboard kan bijwerken zonder handmatige refresh.
- Op Supabase moet **`workflow_events`** in de Realtime-publicatie staan (projectinstellingen of migratie), anders blijven alleen **invalidate na acties** actief.

## 6. Koppeling donatie ↔ order

In deze codebase is er **geen** strikte 1-op-1 FK tussen een donatiebatch en een order. Operationeel: donaties vullen **voorraad** (`inventory_items` / mutatieregels in UI); orders **trekken** voorraad bij levering. De **Inventory**-pagina toont mutatieregels uit openstaande orders en donaties ter indicatie.
