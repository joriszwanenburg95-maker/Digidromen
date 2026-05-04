# Digidromen shadcn/ui Implementatieplan

Datum: 2026-05-04

## Keuze

Gebruik **shadcn/ui** als gratis componentbasis.

Reden:
- gratis en copy-paste, dus geen vendor lock-in;
- Tailwind-native en geschikt voor Vite;
- bouwt op Radix primitives voor accessibility;
- past goed bij Lucide icons;
- goed te themen met de bestaande Digidromen huisstijl;
- laat genoeg ruimte om de app custom en high-end te maken.

Niet kiezen:
- geen betaalde dashboard template als basis;
- geen Material UI/Ant Design, omdat die te snel generiek en minder Digidromen-eigen voelen;
- geen grote componentlaag die de huidige architectuur overneemt.

Bronnen:
- shadcn/ui componenten: https://ui.shadcn.com/docs/components
- shadcn/ui Vite + Tailwind v4 installatie: https://ui.shadcn.com/docs/installation/vite
- shadcn/ui Data Table: https://ui.shadcn.com/docs/components/data-table
- shadcn/ui Blocks: https://ui.shadcn.com/docs/changelog/2024-03-blocks
- Radix accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- TanStack Table: https://tanstack.dev/table/latest/docs/guide/tables

## Productrichting

De portal moet niet voelen als 1 admin-app met andere rechten. Het moet voelen als 3 surfaces in 1 codebase:

| Rol | Surface | UX-model |
|---|---|---|
| `help_org` | Klantportaal | B2B webshop / aanvraagportaal |
| `service_partner` | Warehouse | Takenlijst / WMS-lite |
| `digidromen_staff/admin` | Operations | Regie-cockpit / exception management |

shadcn wordt gebruikt voor dezelfde interactiepatronen, maar de compositie verschilt per rol.

## Themingstrategie

shadcn krijgt een Digidromen theme mapping in `portal/src/index.css`.

Behoud:
- `digidromen-primary`: blauw `#005FB8`
- `digidromen-yellow`: CTA-geel `#FFD500`, alleen voor primaire klantacties
- `digidromen-orange`: links/progressie/accent
- `digidromen-dark`: tekst
- `digidromen-warm` / beige: app background
- `digidromen-blue`: zachte info-accenten

Nieuwe semantische shadcn tokens mappen hierop:
- `--background` -> Digidromen warm/beige
- `--foreground` -> Digidromen dark
- `--card` -> wit
- `--primary` -> Digidromen blauw
- `--secondary` -> beige/cream
- `--accent` -> zachte blauw/oranje tint afhankelijk van component
- `--destructive` -> rood
- `--ring` -> oranje of blauw, niet geel

Regel: componenten gebruiken shadcn semantic tokens; merkexpressie gebeurt via Digidromen token overrides en composite components.

## Gratis componenten die we kiezen

### Core shadcn components

Deze vormen de basislaag onder `portal/src/components/ui`.

| Component | Gebruik in Digidromen |
|---|---|
| `button` | Alle acties, met Digidromen variants |
| `card` | Dashboard tiles, request cards, task cards |
| `badge` | Status, rol, prioriteit, voorraadniveau |
| `table` | Basis voor operationele tabellen |
| `data-table` | Orders, donaties, voorraad, gebruikers, audit |
| `input`, `textarea`, `label`, `field` | Forms en wizard-stappen |
| `select`, `combobox` | Organisatie/product/status filters |
| `checkbox`, `switch`, `radio-group` | Settings en keuzes |
| `tabs` | Detailpagina’s en settings-secties |
| `dialog`, `alert-dialog` | Confirmaties en destructive actions |
| `sheet` | Detailpanels en snelle bewerking op desktop |
| `drawer` | Mobile wizard/detailflow |
| `dropdown-menu` | Row actions en user menu |
| `popover` | Filters, date picker, contextual actions |
| `command` | Command palette / snelle navigatie |
| `tooltip` | Icon-only actions |
| `sonner` | Toasts voor success/error |
| `skeleton` | Loading states |
| `progress` | Wizard progress en statusprogressie |
| `breadcrumb` | Detailpagina’s |
| `sidebar` | App shell desktop |
| `scroll-area` | Lange nav, sheets en activity feeds |
| `empty` | Professionele empty states |

### Extra gratis libraries

Alleen toevoegen waar nodig:

| Package | Waarom |
|---|---|
| `@tanstack/react-table` | Shadcn Data Table voor sorting/filtering/visibility |
| `class-variance-authority` | Nettere button/card/badge variants |
| Radix packages | Worden door shadcn componenten toegevoegd |
| `cmdk` | Command palette via shadcn `command` |
| `sonner` | Toasts |
| `vaul` | Drawer, vooral mobile |
| `recharts` | Alleen als we shadcn `chart` echt implementeren |

Al aanwezig:
- `lucide-react`
- `clsx`
- `tailwind-merge`
- `date-fns`
- `@tanstack/react-query`

## Lucide iconstrategie

Gebruik Lucide als enige structurele iconset.

Icon tokens:
- `icon-xs`: 14px
- `icon-sm`: 16px
- `icon-md`: 18-20px
- `icon-lg`: 24px
- `icon-xl`: 32px voor hero/task visuals

Per domein:
- Aanvragen: `Laptop`, `ShoppingCart`, `PackageCheck`, `CalendarCheck`
- Donaties: `HeartHandshake`, `PackagePlus`, `Truck`, `Recycle`
- Warehouse: `ScanLine`, `Boxes`, `MapPin`, `Wrench`, `ClipboardCheck`
- Operations: `Gauge`, `ListChecks`, `TriangleAlert`, `Activity`, `BarChart3`
- Admin: `Users`, `Shield`, `History`, `Settings`, `KeyRound`

Geen emoji als icons. Geen custom inline SVG tenzij Lucide geen logisch icoon heeft.

## Composite components

Deze maken de app high-end zonder complexiteit toe te voegen.

### App Shell

Bestanden:
- `components/app/AppShell.tsx`
- `components/app/AppSidebar.tsx`
- `components/app/AppTopbar.tsx`
- `components/app/MobileNav.tsx`
- `components/app/CommandMenu.tsx`

shadcn basis:
- `sidebar`
- `button`
- `dropdown-menu`
- `command`
- `sheet`
- `badge`
- `tooltip`

Gedrag:
- desktop: sidebar met rolgerichte nav;
- mobile: topbar + sheet nav of bottom nav voor `help_org`;
- command menu: zoeken/navigeren naar orders, donaties, organisaties;
- rolbadge en organisatiecontext in topbar.

### Page Header

Bestand:
- `components/app/PageHeader.tsx`

shadcn basis:
- `breadcrumb`
- `button`
- `badge`

Gebruik:
- titel;
- subtitel;
- primaire actie;
- secundaire acties;
- optionele status/rol context.

Vervangt losse headers op dashboard, orders, donations, inventory, users, settings.

### Data View

Bestanden:
- `components/data/DataView.tsx`
- `components/data/DataTable.tsx`
- `components/data/DataToolbar.tsx`
- `components/data/RowActions.tsx`
- `components/data/ViewToggle.tsx`

shadcn basis:
- `table`
- `data-table`
- `input`
- `button`
- `dropdown-menu`
- `badge`
- `checkbox`
- `pagination`

Gebruik:
- operations-tabellen;
- filtering;
- column visibility;
- row actions;
- search;
- card/table toggle waar relevant.

### Status System

Bestanden:
- `components/status/StatusBadge.tsx`
- `components/status/StatusTimeline.tsx`
- `components/status/StatusStep.tsx`
- `components/status/WorkflowActionBar.tsx`

shadcn basis:
- `badge`
- `progress`
- `tooltip`
- `button`

Gebruik:
- help_org ziet mensentaal;
- servicepartner ziet taakstatus;
- staff/admin ziet workflowstatus en acties.

### Request Portal Components

Voor `help_org`.

Bestanden:
- `components/request/RequestCatalog.tsx`
- `components/request/RequestProductCard.tsx`
- `components/request/RequestCartSummary.tsx`
- `components/request/RequestCheckout.tsx`
- `components/request/RequestStatusHero.tsx`

shadcn basis:
- `card`
- `button`
- `badge`
- `tabs`
- `drawer`
- `progress`
- `input`
- `textarea`

Doel:
- `/orders` wordt standaard product/request cards;
- wizard voelt als checkout;
- orderdetail voelt als statuspagina.

### Warehouse Components

Voor `service_partner`.

Bestanden:
- `components/warehouse/WarehouseTaskBoard.tsx`
- `components/warehouse/WarehouseTaskCard.tsx`
- `components/warehouse/ReceivingPanel.tsx`
- `components/warehouse/PickPackQueue.tsx`
- `components/warehouse/InventoryLocationCard.tsx`

shadcn basis:
- `card`
- `badge`
- `button`
- `sheet`
- `drawer`
- `tabs`
- `scroll-area`

Doel:
- servicepartner dashboard wordt een werkbak;
- donaties en uitleveringen krijgen snelle statusacties;
- mobile-first voor ontvangst/verwerking.

### Operations Cockpit Components

Voor `digidromen_staff/admin`.

Bestanden:
- `components/operations/ApprovalInbox.tsx`
- `components/operations/ExceptionRail.tsx`
- `components/operations/OperationsMetricGrid.tsx`
- `components/operations/FlowFunnel.tsx`
- `components/operations/ActivityFeed.tsx`

shadcn basis:
- `card`
- `badge`
- `button`
- `data-table`
- `tabs`
- `tooltip`
- `skeleton`

Doel:
- dashboard draait om accordering, risico’s en doorstroming;
- rapportages worden secundair;
- admin-functies blijven gescheiden van operatie.

## Pagina-mapping

### `/dashboard`

| Rol | Nieuwe compositie |
|---|---|
| `help_org` | `RequestPortalHome`: hero, aanvraag CTA, laatste aanvragen, bestelvenster |
| `service_partner` | `WarehouseCommandCenter`: vandaag, pick/pack, receiving, voorraadissues |
| `staff/admin` | `OperationsCockpit`: approval inbox, metrics, exception rail, activity |

shadcn:
- `card`, `button`, `badge`, `skeleton`, `tabs`, eventueel `chart`

### `/orders`

| Rol | Nieuwe compositie |
|---|---|
| `help_org` | request cards + checkout CTA |
| `service_partner` | uitleveringsqueue, table/list hybrid |
| `staff/admin` | DataTable met filters, bulk/row actions |

shadcn:
- `data-table`, `card`, `badge`, `dropdown-menu`, `sheet`, `drawer`

### `/orders/:id`

| Rol | Nieuwe compositie |
|---|---|
| `help_org` | `RequestStatusHero`, timeline, messages/documents |
| `service_partner` | pick/pack/delivery action panel |
| `staff/admin` | workflow action bar, audit context, related records |

shadcn:
- `tabs`, `sheet`, `alert-dialog`, `timeline` custom, `badge`, `button`

### `/donations`

Voor staff/admin/servicepartner:
- intake cards;
- status board;
- DataTable fallback;
- snelle actie in sheet.

shadcn:
- `tabs`, `card`, `data-table`, `sheet`, `dropdown-menu`

### `/inventory`

Voor servicepartner/staff/admin:
- stock signal cards;
- product table;
- locatiecards;
- filters bovenaan.

shadcn:
- `data-table`, `card`, `badge`, `tabs`, `select`, `popover`

### `/settings`

Rolgesplitst:
- help_org: eigen organisatieprofiel;
- servicepartner: eigen profiel/warehouse voorkeuren;
- staff/admin: systeeminstellingen, producten, bestelvenster, gebruikersbeheer waar van toepassing.

shadcn:
- `tabs`, `card`, `field`, `input`, `switch`, `select`, `alert-dialog`

## Implementatiefases

### Fase 1 — shadcn foundation

Doel: componentbasis installeren zonder pagina’s te herschrijven.

Taken:
- shadcn init voor Vite/Tailwind v4;
- `components.json` toevoegen;
- `src/lib/utils.ts` met `cn`;
- basis `ui` componenten toevoegen:
  - button
  - card
  - badge
  - input
  - label
  - textarea
  - select
  - checkbox
  - switch
  - tabs
  - dialog
  - alert-dialog
  - sheet
  - dropdown-menu
  - tooltip
  - skeleton
  - separator
  - table
  - empty
  - sonner
- Digidromen theme tokens mappen;
- bestaande knoppen/badges niet direct massaal vervangen.

Acceptatie:
- build groen;
- bestaande UI blijft werken;
- shadcn button/card/badge tonen Digidromen stijl.

### Fase 2 — App Shell en PageHeader

Doel: direct premiumer gevoel over de hele app.

Taken:
- `Layout.tsx` refactoren naar shadcn `Sidebar`;
- `PageHeader` introduceren;
- command menu toevoegen voor desktop power users;
- mobile navigation verbeteren;
- logo correct behouden.

Acceptatie:
- alle rollen behouden juiste nav;
- help_org nav blijft maximaal 3 items;
- servicepartner ziet werkgerichte nav;
- admin beheer blijft apart gegroepeerd.

### Fase 3 — DataView voor operations

Doel: tabellen worden professioneel en consistent.

Taken:
- `@tanstack/react-table` toevoegen;
- reusable `DataTable` + `DataToolbar`;
- orders/donations/inventory/users/audit stapsgewijs migreren;
- row actions via `DropdownMenu`;
- detail preview via `Sheet`.

Acceptatie:
- sort/filter/search werkt;
- mobile heeft card/list fallback of horizontale scroll met duidelijke affordance;
- staff/admin workflow blijft snel.

### Fase 4 — Help_org request portal

Doel: hulporganisatie voelt als klant/webshop.

Taken:
- `RequestProductCard`;
- `RequestCheckout` op basis van huidige `OrderWizard`;
- `RequestStatusHero`;
- `/orders` standaard card view;
- orderdetail statuslijn in gewone taal.

Acceptatie:
- geen operationele kolommen voor help_org;
- primaire CTA is duidelijk;
- checkout heeft progress, back, save draft, clear errors.

### Fase 5 — Servicepartner warehouse

Doel: werken vanaf taken in plaats van navigeren door tabellen.

Taken:
- `WarehouseTaskBoard`;
- `ReceivingPanel`;
- `PickPackQueue`;
- mobile drawer actions;
- voorraad/locatiecards.

Acceptatie:
- servicepartner kan vanaf dashboard naar de belangrijkste taak;
- touch targets minimaal 44px;
- statusacties zijn groot en duidelijk.

### Fase 6 — Operations cockpit

Doel: Digidromen ziet waar regie nodig is.

Taken:
- `ApprovalInbox`;
- `ExceptionRail`;
- metrics grid;
- donatie-tot-levering funnel;
- activity feed opschonen.

Acceptatie:
- accordering staat bovenaan;
- risico’s zijn zichtbaar zonder rapportagepagina te openen;
- admin-only functies blijven niet door de dagelijkse cockpit heen lopen.

## Componenten per bestaand bestand

| Huidig bestand | Actie |
|---|---|
| `Layout.tsx` | vervangen door AppShell + shadcn Sidebar/Dropdown/Command |
| `KpiCard.tsx` | vervangen door `MetricTile` op shadcn Card |
| `StatusBadge.tsx` | houden als composite boven shadcn Badge |
| `ConfirmDialog.tsx` | vervangen door shadcn AlertDialog |
| `LoadingButton.tsx` | vervangen door Button variant met spinner |
| `DataTable.tsx` | vervangen/uitbreiden met TanStack + shadcn table |
| `EmptyState.tsx` | vervangen door shadcn Empty composite |
| `OrderWizard.tsx` | refactor naar RequestCheckout + Drawer/Dialog |
| `FileUpload.tsx` | shadcn Card/Input/Button + drag state |
| `Timeline.tsx` | behouden als custom composite, styling via tokens |
| `ProductCatalog.tsx` | refactor naar RequestCatalog cards |

## Designregels

- `help_org`: cards, steppers, status timeline, weinig tabellen.
- `service_partner`: task cards, sheets/drawers, large tap actions.
- `staff/admin`: DataTable, filters, command menu, exception cards.
- Geel alleen voor primaire klantactie of heel spaarzame CTA.
- Blauw voor primaire operationele acties.
- Oranje voor progressie, links en aandacht.
- Geen gradients/orbs als decoratie.
- Geen card-in-card stapeling zonder functionele reden.
- Alle icon-only buttons hebben tooltip en `aria-label`.

## Eerste implementatieprompt

Gebruik deze prompt voor de volgende bouwstap:

```text
Implementeer fase 1 en 2 van docs/2026-05-04-shadcn-ui-implementation-plan.md.
Gebruik shadcn/ui in deze Vite React Tailwind v4 app zonder Next.js aannames.
Behoud de Digidromen huisstijl tokens uit DESIGN.md.
Installeer alleen gratis shadcn/Radix dependencies die nodig zijn voor:
button, card, badge, input, label, textarea, select, checkbox, switch, tabs,
dialog, alert-dialog, sheet, dropdown-menu, tooltip, skeleton, separator,
table, empty, sonner en sidebar.
Maak src/lib/utils.ts met cn.
Refactor daarna Layout.tsx naar een AppShell met rolgerichte sidebar,
topbar, correcte logo-rendering, Lucide icons, role badge, en mobile sheet nav.
Laat bestaande businesslogica en routes intact.
Verifieer met npm run build.
```

