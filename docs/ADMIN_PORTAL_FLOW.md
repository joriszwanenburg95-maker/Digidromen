# Beheerder (digidromen_admin) — portalflow en UAT-checklist

**Laatste update:** 2026-04-14  
**Doel:** Vastleggen welke stappen een beheerder kan en moet kunnen doen, en wat er na deploy op Vercel zichtbaar moet zijn.

## Belangrijk: productie vs. repository

De **huidige productiebuild** op Vercel kan achterlopen op `main`. Als de voorraadpagina nog **«Laptopvoorraad»** met alleen locatie/aantallen toont en **geen** kolommen SKU / Product / Categorie, dan draait er nog een **oudere bundle**. In deze repo heeft **Voorraad** (`portal/src/pages/Inventory.tsx`) onder meer:

- Tabellen met **SKU**, **Product**, **Categorie** (badge), locatie, conditie, totalen;
- Tabs **Mutatieregels** en **Toekomstige mutaties**;
- CSV-import met echte **upsert door eerst te zoeken op product + locatie** (geen kapotte `onConflict` zonder DB-constraint).

Na **deploy van de laatste commit** moeten producttags/categorieën zichtbaar zijn zodra `inventory_items` gekoppeld is aan `products` en de join `products(sku, name, category)` data teruggeeft.

## Rol: digidromen_admin

- Ziet **alle** navigatie-items (Dashboard, Bestellingen, Donaties, Planning, Voorraad, Prognose, Rapportages, CRM Sync, Organisaties, Gebruikers, Audit Log, Locaties, Instellingen).
- Mag **bestellingen aanmaken** (zelfde knop als staff / help_org binnen regels).
- Mag **volledige orderworkflow** bedienen volgens `OrderDetail.tsx`: o.a. `ingediend` → `te_accorderen` → `geaccordeerd` → `in_voorbereiding` → `geleverd` → `afgesloten`, en `afgewezen`.
- Mag **bezorgdatum** (`delivery_date`) op orders zetten (zelfde blok als servicepartner/staff).
- Mag **voorraad** bekijken en (met staff) **CSV-import** gebruiken op Voorraad.

## UAT-checklist beheerder

### Dashboard

- [ ] KPI-kaarten tonen open orders, open donaties, meldingen, lage voorraad.
- [ ] Recente activiteit toont `workflow_events` (orders, donaties, etc.).
- [ ] Snelle routes naar Bestellingen / Donaties / Voorraad werken.

### Bestellingen

- [ ] Lijst toont **alle** orders (geen filter op organisatie).
- [ ] **Bestelling toevoegen** opent wizard; indienen respecteert bestelvenster tenzij admin-bypass (zie `OrderingWindowBanner` / config `ordering_windows`).
- [ ] Orderdetail: statusknoppen kloppen met huidige status; timeline vult na mutatie.
- [ ] Berichten en documenten (metadata) kunnen worden toegevoegd binnen RLS.

### Donaties

- [ ] Overzicht en detail; toewijzing servicepartner / locatie waar van toepassing.

### Voorraad (na deploy van huidige code)

- [ ] Tabelkolommen: SKU, Product, Categorie (badge), Locatie, Conditie, Totaal, Beschikbaar.
- [ ] Filters op categorie en conditie; zoekveld.
- [ ] CSV-import: voorbeeld invullen → import → geen dubbele rijen per product+locatie; bestaande rij wordt bijgewerkt.
- [ ] Mutatieregels tonen orders en donaties als stroom.

### Gebruikers & organisaties

- [ ] Gebruikers uitnodigen (magic link), rol + organisatie koppelen.
- [ ] Organisaties beheren / detail.

### Overig

- [ ] CRM Sync, Audit Log, Locaties, Instellingen laden zonder console-errors.
- [ ] Prognose: lege staat of snapshot JSON indien data bestaat.

## Aanvullende fixes (2026-04-14)

- **Dashboard help_org:** geen donatie-query; activiteit gefilterd op `case_type === "order"`; geen donatie-spotlight; geen voorraadsignalen; open orders alleen **eigen** `organization_id`.
- **Orderdetail help_org:** blok **Bezorgdatum** altijd zichtbaar; leeg = tekst *Nog niet ingevuld door servicepartner*.
- **DataTable:** stabiele row keys i.p.v. `Math.random()`.

## Referenties

- Orderworkflow rollen: `portal/src/pages/OrderDetail.tsx` (`getNextStatuses`).
- Voorraad UI en import: `portal/src/pages/Inventory.tsx`.
- Datamodel: `docs/DATA_MODEL_ARCHITECTURE.md`.
- Redesign-spec orderrollen: `docs/superpowers/specs/2026-04-02-portal-redesign-design.md` (R7).
