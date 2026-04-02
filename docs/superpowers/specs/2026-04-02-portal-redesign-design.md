# Digidromen Portal — Volledig Redesign Spec
**Datum:** 2026-04-02  
**Status:** Goedgekeurd voor implementatie  
**Aanpak:** Order-gedreven redesign (Route 3)

---

## Samenvatting

Het portal wordt herontworpen vanuit het orderproces als centrale entiteit. Reparaties als apart domein verdwijnen volledig; vervanging wordt een ordertype. Orders en donaties krijgen echte conceptopslag, strikte stapvalidatie, uniforme statushistorie, planningsoverzicht en voorraadmutaties op eventniveau. De UX wordt volledig herontworpen met een moderne, rolgerichte interface.

---

## Sub-projecten

| # | Sub-project | Scope |
|---|---|---|
| SP1 | Datamodel & backend | Schema-uitbreidingen, repair verwijderen, nieuwe statussets, bestelvenster-config, powerbank |
| SP2 | Order-flow redesign | Wizard per producttype, drafts, statusflows, bestelvenstervalidatie, servicepartner bezorgdatum |
| SP3 | Donatie & planning redesign | Donatieflow, planning/kalender pagina, voorraadmutaties per event |
| SP4 | UX redesign | Nieuwe navigatiestructuur, alle pagina's herontworpen, mobiele warehouse flows |

---

## Requirements

### R1 — Productcatalogus
- Bestelbare typen: laptoppakket, defectvervanging (laptop, kabel, muis, headset, powerbank), accessoires
- Powerbank als apart bestelbaar vervangingsproduct
- `products` tabel uitbreiden met `order_scenario` (new_request|replacement|accessory), `is_orderable`, `replacement_product`

### R2 — Productstamgegevens
- Velden: `sku`, `bundle_components` (JSON), `inventory_managed` (bool), `replacement_product` (bool), `unit`
- ProductCatalog UI tonen in Settings

### R3 — Organisaties en bestelprofiel
- `organizations` uitbreiden: doelgroep, bestelgerechtigdheid (bool), reminder_opt_in, extra contactpersonen
- Contacten normaliseren naar aparte tabel `organization_contacts`

### R4 — Orderkop
- `orders` uitbreiden: `archive_status`, `delivery_date` (door servicepartner), `delivery_date_source` (enum: manual|integration), `delivery_date_set_by` (user_id), `approval_status` (los van `status`)
- Archiefstatus los van workflow-status

### R5 — Orderregels
- UI-wizard per producttype met verplichte velden:
  - Laptop vervanging: SRN + klachtomschrijving verplicht
  - Kabel vervanging: wattage+poort OF foto's+SRN
  - Powerbank: SRN of serienummer + klachtomschrijving
  - Nieuwe aanvraag: doelgroepomschrijving
- Foto-uploads via Supabase Storage
- `order_lines` uitbreiden: `defect_srn`, `defect_description`, `replacement_reason`, `attachment_document_ids`

### R6 — Bestelvenster (KRITIEK)
- `portal_config` key `ordering_windows`: array van `{month_day_start, month_day_end, label}`
- Default: dag 1 t/m 7 van elke maand
- Submit-blokkering in backend (Supabase RLS of Edge Function check) én UI-feedback
- Buiten venster: duidelijke melding welke dag het venster opent
- `digidromen_admin` kan altijd bestellen (bypass)

### R7 — Orderworkflow
Nieuwe canonieke statusset (vervangt huidige):
```
concept → ingediend → te_accorderen → geaccordeerd → in_voorbereiding → geleverd → afgesloten | afgewezen
```
- `repair_cases` en `repair_logs` tabellen worden niet meer gebruikt via UI; routes verwijderd
- `workflow_events` tabel blijft als audittrail
- Rolgebonden acties:
  - `help_org`: aanmaken, concept opslaan, indienen (binnen venster)
  - `digidromen_staff`: accordering, in_voorbereiding zetten
  - `digidromen_admin`: alles + bypass bestelvenster
  - `service_partner`: bezorgdatum invullen, geleverd zetten

### R8 — Notificaties
- E-mailnotificatie bij statusovergang (bestaand systeem uitbreiden)
- Bestelherinnering via `reminder-cron` (dag 1 van de maand)

### R9 — Donateurs
- `organizations` met `type = 'donor'` (nieuw subtype)
- Donor-specifieke velden: `donor_since`, `preferred_pickup_day`, `crm_donor_id`
- CRM-sync sleutel expliciet: `crm_hubspot_id` is leidend

### R10 — Donatieproces
Nieuwe statusset:
```
concept → aangemeld → pickup_gepland → ontvangen → in_verwerking → verwerkt | geannuleerd
```
- Overgang naar `verwerkt`: certificaat verplicht (data wipe + inventarisatie)
- `donation_batches` uitbreiden: `processing_result` (JSON), `certificate_required_at`

### R11 — Voorraadmutaties (KRITIEK)
- Nieuwe tabel `inventory_movements`:
  ```sql
  id, product_id, stock_location_id, quantity_delta, movement_type 
  (order_fulfillment|donation_receipt|repair_consumption|adjustment|return),
  source_case_id, source_case_type, note, created_by, created_at
  ```
- Bundel-uitlevering: 1 order → meerdere movements (laptop + muis + headset + rugzak + handleiding)
- Alle voorraadwijzigingen verlopen via `inventory_movements`; `inventory_items.available_quantity` is derived

### R12 — Aces Direct / servicepartner bezorgdatum
- `orders.delivery_date` wordt ingevuld door `service_partner` rol
- Veld is read-only voor `help_org`
- `delivery_date_changed_at`, `delivery_date_set_by` worden gelogd
- Wijziging wordt vastgelegd als `workflow_event`
- Interface: servicepartner ziet "Bezorgdatum vastleggen" actie op order in `geaccordeerd` of `in_voorbereiding` status

### R13 — Datakwaliteit
- Server-side drafts: `orders` en `donation_batches` met `status = 'concept'` worden automatisch opgeslagen (autosave 30s)
- Lokale fallback via localStorage voor concept-id
- Adresvalidatie: postcode + huisnummer verplicht veld met format check (NL)
- Verplichte velden getoond als stap in wizard, niet als losse submit-error

### R14 — Planning/kalender
- Nieuwe pagina `/planning`
- Toont: geplande pickups, verwachte bezorgingen, verwachte voorraadbinnenkomst
- Weekweergave + maandweergave toggle
- Zichtbaar voor: `digidromen_staff`, `digidromen_admin`, `service_partner`

### R15 — Rapportages
- Maandrapportage: orders per status, donaties per status, voorraadmutaties, geen repair-data
- Export: CSV per entiteit
- Certificaatoverzicht als aparte rapportage
- `forecast_snapshots` blijft bestaan

### R16 — Leveringscommunicatie
- Bezorgdatum zichtbaar voor `help_org` zodra ingevuld (geen bevestigingsknop)
- `help_org` kan datum niet wijzigen
- Audittrail: `workflow_events` + `delivery_date_set_by` + `delivery_date_changed_at`
- UI toont "Bezorgdatum: [datum] (ingevuld door Aces Direct)" of "Bezorgdatum: nog niet ingevuld"

---

## UX Redesign Principes

### Navigatiestructuur (nieuw)
```
help_org:
  Dashboard | Mijn Bestellingen | Nieuwe Bestelling | Mijn Organisatie

digidromen_staff/admin:
  Dashboard | Bestellingen | Donaties | Voorraad | Planning | Organisaties | Gebruikers | Instellingen | Rapporten

service_partner:
  Dashboard | Mijn Orders (te verwerken) | Donaties | Voorraad | Planning
```

### Repair-items verwijderd uit navigatie
- `/repairs` en `/repairs/:id` routes verwijderd
- Sidebar-link verwijderd
- Rapportages zonder repair-sectie

### Order-wizard (nieuw, stap-gebaseerd)
```
Stap 1: Producttype kiezen
Stap 2: Productspecifieke verplichte velden + uploads
Stap 3: Leveringsadres + gewenste datum
Stap 4: Overzicht + indienen (geblokkeerd buiten bestelvenster)
```

### Warehouse flows (mobile-first)
- Donatie ontvangst: wizard met grote tap targets
- Bezorgdatum invullen: enkelvoudige actie, prominente knop
- Voorraad mutaties: scan/type serienummer + bevestigen

### Skeleton loading & knopfeedback (overal verplicht)
- **Skeleton loading**: elke lijst, tabel, detailpagina en kaart toont een skeleton placeholder tijdens laden (geen spinner-only)
- **Knopfeedback**: elke submit/actieknop toont een laadstatus (spinner in de knop + disabled) zolang de actie loopt
- **Succesbevestiging**: na succesvolle actie korte inline bevestiging (groene checkmark of toast), niet alleen een pagina-reload
- **Foutfeedback**: bij mislukte actie inline foutmelding naast de knop of boven het formulier, nooit stil falen
- Geldt voor: order indienen, statuswissels, bezorgdatum opslaan, donatie opslaan, uitnodiging versturen, verwijderen, uploads

### Statusovergangen (visueel)
- Timeline component toont statushistorie
- Rolgekoppelde actieknoppen: alleen zichtbaar voor wie mag handelen
- Bestelvenster-banner: zichtbaar op dashboard en /orders voor `help_org`

---

## Ontwerpbeslissingen

| # | Beslissing |
|---|---|
| O1 | Server-side drafts in Supabase + localStorage fallback |
| O2 | Donateurs als `organizations` subtype (`type = 'donor'`) |
| O3 | Portal leidend voor planning; Aces Direct vult bezorgdatum in via portal UI |
| O4 | Uploads direct naar Supabase Storage + documentrecords in `documents` tabel |
| O5 | Aparte `/planning` pagina + samenvatting op dashboard |
| O6 | Bestelvenster configureerbaar in Settings, default dag 1-7 |
| O7 | Servicepartner = bronhouder bezorgdatum; integratie is toekomstig invulmechanisme |

---

## Wat verdwijnt

- `repair_cases` tabel: niet meer via UI benaderbaar (data blijft in DB)
- `repair_logs` tabel: niet meer via UI benaderbaar
- `/repairs` en `/repairs/:id` routes en pagina's
- Repair-sectie in rapportages en dashboard
- Repair-terminologie in navigatie en statusbadges

---

## Testscenario's (canoniek)

1. Hulporganisatie start concept, ververst pagina, gaat verder zonder dataverlies
2. Vervanging laptop: geblokkeerd zonder SRN + klachtomschrijving
3. Vervanging voedingskabel: wattage+poort OF foto's+SRN
4. Bestellen buiten venster: geblokkeerd met melding wanneer venster opent
5. Digidromen accordeert: statushistorie + notificatie + geplande bezorgdatum correct
6. Aces Direct vult bezorgdatum in: planning-pagina direct bijgewerkt
7. Donatieconcept bewaard na refresh
8. Donatie naar Verwerkt: geblokkeerd zonder certificaat
9. Uitlevering laptoppakket: 5+ inventory_movements aangemaakt
10. Maandrapportage: geen repair-data
11. Dag 12 bestelling: geblokkeerd, duidelijke melding
12. Dag 3 bestelling: actief venster zichtbaar, bestelling mogelijk
13. Servicepartner vult bezorgdatum in: hulporganisatie ziet datum direct, read-only
14. Hulporganisatie kan bezorgdatum niet wijzigen
15. Bezorgdatumwijziging gelogd in workflow_events
16. Powerbank bestellen via defect-/vervangingsflow

---

## Technische randvoorwaarden

- Vite SPA, geen SSR — bestelvenstercheck via Edge Function of RLS policy
- TanStack Query v5 voor alle data fetching
- Supabase Realtime voor live updates planning/voorraad
- `portal_config` voor bestelvenster-configuratie
- Types regenereren na schema-wijziging: `supabase gen types typescript --project-id oyxcwfozoxlgdclchden`
