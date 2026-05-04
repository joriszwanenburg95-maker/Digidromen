# Digidromen Portal UI/UX Role Spec

Datum: 2026-05-04
Doel: de portal high-end, rolgericht en expliciet Digidromen-eigen maken zonder de bestaande Vite/React/Supabase architectuur zwaarder te maken.

Laatste implementatiestatus:
- Fase 1 van `2026-05-04-shadcn-ui-implementation-plan.md` is uitgevoerd: shadcn/ui foundation, `components.json`, `src/lib/utils.ts` met `cn`, semantische shadcn tokens op Digidromen huisstijl en de afgesproken gratis componentbasis.
- Fase 2 is uitgevoerd: `Layout.tsx` is vervangen door een AppShell met rolgerichte sidebar, topbar, mobile sheet navigation, role badge, echte logo-rendering en `cmd+k` command palette.
- De shell gebruikt `roleSurface` als bron voor navigatie, labels en guards. Daardoor blijft de bestaande businesslogica intact, terwijl de UI per rol anders aanvoelt.
- De huidige command palette is gebaseerd op `cmdk` en toont per rol alleen de relevante navigatie-items; admin ziet daarnaast de beheer-groep.
- Animatie is bewust ingetogen: alleen opacity/transform micro-interactions, met Digidromen-warme styling en respect voor `prefers-reduced-motion`.

Gebruikte skills:
- `ui-ux-pro-max`: prioriteit op accessibility, touch targets, performance, responsive layout, consistente styling, animatie en data-UX.
- `digidromen-branding`: Digidromen-kleuren, typografie, toon en missie als leidende ontwerpbron.

Belangrijke keuze: `ui-ux-pro-max` adviseert voor een operations portal een data-dense dashboardstijl. De automatisch voorgestelde donkere, technische stijl wordt niet letterlijk overgenomen, omdat die botst met Digidromen. We nemen de data-UX en componentkwaliteit over, maar houden Digidromen leidend: warm, toegankelijk, beige basis, geel als primaire CTA, donkergrijs voor tekst, oranje voor links/accent, blauw alleen als ondersteunende tertiaire kleur.

## Productmodel

De portal is geen uniforme admin-app voor iedereen. Het is drie producten in een gedeelde codebase:

1. **Hulporganisatie / klant**
   - Doel: laptops of vervangende onderdelen aanvragen en eigen aanvragen volgen.
   - UX-metafoor: webshop / aanvraagportaal.
   - Mag zien: eigen organisatie, eigen aanvragen, eigen berichten/documenten rond eigen orders, bestelvenster, eigen instellingen.
   - Mag niet zien: donaties, voorraad, planning, prognose, rapportages, CRM, alle organisaties, gebruikers, audit, locaties, servicepartner-werkvoorraad.

2. **Serviceorganisatie / servicepartner**
   - Doel: werken: donaties ontvangen, verwerken, voorraad/logistiek bijhouden, orders uitleveren.
   - UX-metafoor: warehouse command center / werkvoorraad.
   - Mag zien: toegewezen donaties, toegewezen orders, voorraad, locaties, planning, relevante operationele signalen.
   - Mag niet zien: gebruikersbeheer, CRM-sync, audit log, organisatiebeheer buiten wat nodig is voor context, strategische rapportages tenzij expliciet nodig.

3. **Digidromen staff/admin**
   - Doel: regie: accordering, planning, organisaties, voorraad, rapportage, gebruikers, audit en integraties.
   - UX-metafoor: operations cockpit.
   - Staff mag zien: operationele regiepagina's.
   - Admin mag daarnaast zien: gebruikers, audit log, technische instellingen.

## Actuele AppShell

De AppShell is de gedeelde technische laag, maar niet de gedeelde gebruikerservaring. De shell kiest op basis van de ingelogde rol een andere navigatie, taal en surface:

| Rol | Surface in AppShell | Navigatiemodel | Doorontwikkelrichting |
|---|---|---|---|
| `help_org` | Aanvraagportaal | Maximaal 3 items: Start, Aanvragen, Mijn organisatie | Checkout-achtige aanvraagflow, statuspagina in mensentaal, weinig tabellen |
| `service_partner` | Werkvoorraad | Taken en operationele werkbakken | Warehouse task board, grote statusacties, mobile-first verwerking |
| `digidromen_staff` | Operations cockpit | Regiepagina's zonder adminbeheer | Accordering, uitzonderingen, planning, operationele signalen |
| `digidromen_admin` | Operations + beheer | Staff-navigatie plus aparte beheer-groep | Gebruikers, audit, integraties en technische beheerfuncties gescheiden houden van dagelijks werk |

Belangrijke afspraak voor vervolgwerk:
- Voeg nieuwe navigatie en roltaal eerst toe aan `portal/src/lib/roleSurface.ts`.
- Pagina's mogen technisch dezelfde route blijven gebruiken, maar de compositie moet per rol anders kunnen zijn.
- Hulporganisatiepagina's vermijden backoffice-taal zoals orders, workflow mutaties, prioriteit en servicepartnerdetails.
- Servicepartnerpagina's starten vanuit taken en statusacties, niet vanuit rapportages.
- Staff/adminpagina's mogen data-dense zijn, maar blijven warm, rustig en Digidromen-eigen.
- Adminbeheer blijft apart gegroepeerd en mag niet door de dagelijkse operations cockpit heen lopen.

## Designprincipes

### Branding

Gebruik één token-set, geen losse hexes in componenten:

| Token | Waarde | Gebruik |
|---|---:|---|
| `digidromen-yellow` | `#FFD500` | primaire CTA, actieve klantactie |
| `digidromen-orange` | `#EE7219` | links, actieve accenten, progressie |
| `digidromen-orange-hover` | `#B75C0E` | hover op links/accent |
| `digidromen-dark` | `#2E3848` | headings, body op lichte vlakken |
| `digidromen-beige` | `#FBF4EB` | app background |
| `digidromen-blue` | `#87CEDC` | tertiaire info-accenten |
| `surface` | `#FFFFFF` | kaarten, panels, modals |
| `surface-soft` | `#FFF9EA` | zachte klantpanelen |

Typografie:
- Headings: `Sora`, 600.
- Body: `Roboto`, 400/500/700.
- Body minimum: 16px op mobiel, 18px waar ruimte is.

Logo:
- Gebruik echte asset `/Digidromen logo.png`.
- Geen `brightness`, `invert`, filter of recolor op het logo.
- Plaats logo op beige/wit vlak met vaste hoogte en `object-contain`.
- Later bij voorkeur vervangen door transparante SVG/PNG zonder beige achtergrond, maar niet blokkeren op assetwerk.

### UI-kwaliteit

Alle rollen:
- Touch targets minimaal 44x44px.
- Focus states zichtbaar.
- Knoppen: 20px radius voor vriendelijke Digidromen-stijl.
- Tabellen: hover, focus, duidelijke empty states, vaste actiezone rechts.
- Skeletons boven spinners bij route/data loading.
- Animaties: alleen opacity/transform, 150-250ms, respecteer `prefers-reduced-motion`.
- Geen emoji als iconen; gebruik Lucide.
- Geen decoratieve gradient/orb-achtergronden. Digidromen mag warm zijn, maar niet rommelig.

## Paginastrategie

Huidige pagina's:
- Dashboard
- Bestellingen
- Donaties
- Planning
- Voorraad
- Prognose
- Rapportages
- CRM Sync
- Organisaties
- Gebruikers
- Audit Log
- Locaties
- Instellingen

Niet alle pagina's moeten voor alle rollen bestaan. Sommige pagina's blijven technisch bestaan voor deep links en guards, maar verdwijnen uit navigatie of krijgen per rol een andere naam.

## Rolnavigatie

### Hulporganisatie / klant

Navigatie moet maximaal 3 items hebben:

| Nav label | Route | Pagina blijft? | UI-type |
|---|---|---:|---|
| Start | `/dashboard` | ja | klant-dashboard |
| Aanvragen | `/orders` | ja, hernoemd in UI | webshop/orderhistorie |
| Mijn organisatie | `/settings` | ja, gefilterde settings | profiel + standaardgegevens |

Verdwijnt volledig uit help_org navigatie:
- Donaties
- Planning
- Voorraad
- Prognose
- Rapportages
- CRM Sync
- Organisaties
- Gebruikers
- Audit Log
- Locaties

Directe routeguard:
- Help_org direct naar bovenstaande operationele routes moet redirecten naar `/dashboard`.
- Orderdetail moet alleen eigen `organization_id` tonen.
- Berichten/documenten/workflow-events moeten pas laden nadat de eigen order is bevestigd.

#### Help_org pagina's

**Start (`/dashboard`)**
- Hero: `Samen maken we digidromen waar` of `Laptop aanvragen voor jullie doelgroep`.
- Primaire CTA: `Nieuwe aanvraag`.
- Secundaire CTA: `Bekijk mijn aanvragen`.
- Componenten:
  - `MissionHeroPanel`: warme hero met Digidromen-logo, korte missiecopy en CTA.
  - `OrderingWindowStrip`: toont of aanvragen open zijn.
  - `MyRequestTimeline`: laatste 3 eigen aanvragen met statusstappen.
  - `NeedHelpPanel`: uitleg in gewone taal, geen operationele termen.
- Niet tonen:
  - algemene workflow-events
  - algemene notificaties
  - voorraad- of donatiesignalen
  - KPI's die intern aanvoelen zoals “records”

**Aanvragen (`/orders`)**
- Gedrag: webshop/orderhistorie.
- Kop: `Laptop aanvragen`.
- Primaire CTA: `Nieuwe aanvraag`.
- Tabelnaam: `Mijn aanvragen`, niet “Orders”.
- Kolommen:
  - Aanvraag
  - Producten
  - Status
  - Gewenste leverdatum
  - Actie
- Verberg:
  - klantkolom
  - prioriteit
  - servicepartner/operationele velden
- Componenten:
  - `RequestProductPicker`: cards voor laptoppakket en vervangingen.
  - `CheckoutStepper`: Product → Gegevens → Levering → Bevestigen.
  - `FriendlyStatusTracker`: visuele statuslijn in mensentaal.
  - `RequestEmptyState`: “Nog geen aanvragen. Start een eerste aanvraag.”

**Orderdetail (`/orders/:id`)**
- Gedrag: klantstatuspagina.
- Niet laten voelen als backoffice.
- Componenten:
  - `RequestStatusHero`: aanvraagnummer, status, volgende verwachting.
  - `DeliveryPreferenceCard`: leverdatum aanpassen indien toegestaan.
  - `MessageThread`: berichten bij de aanvraag.
  - `DocumentList`: documenten bij de aanvraag.
- Verberg workflow-mutatieknoppen voor help_org.
- Toon technische IDs alleen subtiel; primair is status en inhoud.

**Mijn organisatie (`/settings`)**
- Alleen help_org-relevante secties:
  - organisatieprofiel
  - contactgegevens
  - doelgroepomschrijving
  - leveradres/standaardgegevens
- Verberg:
  - producten
  - bestelvensterbeheer
  - gebruikersbeheer
  - voorraadconfiguratie

### Serviceorganisatie / servicepartner

Navigatie moet werken als takenlijst, niet als algemene admin:

| Nav label | Route | Pagina blijft? | UI-type |
|---|---|---:|---|
| Werkvoorraad | `/dashboard` | ja, rolvariant | command center |
| Uitleveringen | `/orders` | ja, servicevariant | toegewezen orders |
| Donaties | `/donations` | ja | intake/verwerking |
| Voorraad | `/inventory` | ja | warehouse voorraad |
| Locaties | `/stock-locations` | ja, aanbevolen toevoegen voor servicepartner | locatiebeheer |
| Instellingen | `/settings` | ja, gefilterd | eigen profiel |

Te verwijderen uit servicepartner navigatie:
- Planning, tenzij deze echt servicepartner-acties bevat. Als planning blijft, label: `Planning`.
- Prognose
- Rapportages
- CRM Sync
- Organisaties
- Gebruikers
- Audit Log

#### Servicepartner pagina's

**Werkvoorraad (`/dashboard`)**
- Doel: vandaag weten wat moet gebeuren.
- Componenten:
  - `WarehouseActionRail`: aantal batches te ontvangen, orders te leveren, voorraadissues.
  - `TodayQueue`: taken gesorteerd op urgentie.
  - `AssignedDonationsBoard`: donaties per status.
  - `DeliveryQueue`: orders in voorbereiding.
  - `StockSignalStrip`: lage voorraad of ontbrekende accessoires.
- Design: data-dense maar warm; minder hero, meer werkruimte.

**Uitleveringen (`/orders`)**
- Alleen toegewezen orders of orders waar servicepartner actie op heeft.
- Primaire acties:
  - markeren geleverd
  - leverdatum invullen
  - details bekijken
- Componenten:
  - `FulfillmentTable`: vaste actieknop rechts, status filters bovenaan.
  - `DeliveryBatchCards`: optioneel op mobile.

**Donaties (`/donations`)**
- Kernpagina voor servicepartner.
- Componenten:
  - `DonationKanban`: Aangemeld → Pickup gepland → Ontvangen → In verwerking → Verwerkt.
  - `PickupPlannerSheet`: datum/tijdvenster invullen.
  - `DonationAssignmentSummary`: toegewezen locatie/partner.
  - `ProcessingChecklist`: intake/verwerking stappen.
- Mobile-first: grote tap targets, wizard/sheet-stijl.

**Voorraad (`/inventory`)**
- Componenten:
  - `InventoryHealthHeader`: beschikbaar/gereserveerd/binnenkomend.
  - `StockLocationTabs`: locatiegebaseerd filteren.
  - `AccessoryStockCards`: muis/rugzak/headset/kabel snel zichtbaar.
  - `MovementDrawer`: mutaties bekijken/toevoegen.
- Belangrijk: servicepartner ziet voorraad als werkvoorraad, niet als financiële rapportage.

**Locaties (`/stock-locations`)**
- Voor servicepartner nuttig als zij eigen locaties beheren.
- Als servicepartner niets kan wijzigen: wel tonen als read-only context, of uit navigatie halen.

**Instellingen**
- Alleen eigen profiel/organisatiecontext.
- Geen admin-instellingen.

### Digidromen staff

Navigatie:

| Nav label | Route | Pagina blijft? | UI-type |
|---|---|---:|---|
| Regie | `/dashboard` | ja, rolvariant | operations cockpit |
| Bestellingen | `/orders` | ja | accordering/uitlevering |
| Donaties | `/donations` | ja | donatiecoördinatie |
| Planning | `/planning` | ja | operationele planning |
| Voorraad | `/inventory` | ja | totaalvoorraad |
| Prognose | `/forecast` | ja | forecast |
| Rapportages | `/reports` | ja | managementinformatie |
| Organisaties | `/organizations` | ja | relatiebeheer |
| Locaties | `/stock-locations` | ja | service/warehouse structuur |
| Instellingen | `/settings` | ja | staff-instellingen |

Uit staff hoofdnavigatie halen:
- CRM Sync: verplaatsen naar `Instellingen > Integraties` of admin-only technische sectie, tenzij staff dagelijks synchronisatie beheert.
- Gebruikers: admin-only.
- Audit Log: admin-only.

#### Staff pagina's

**Regie (`/dashboard`)**
- Componenten:
  - `ApprovalCommandCard`: te accorderen bestellingen.
  - `OperationsBentoGrid`: open orders, open donaties, voorraadsignalen, geplande leveringen.
  - `ExceptionRail`: wat vraagt aandacht.
  - `RecentActivityFeed`: operationele events.

**Bestellingen**
- Accordering prominent.
- Componenten:
  - `ApprovalInbox`: status `te_accorderen` als aparte inbox.
  - `OrderTablePro`: filters, status tabs, klantkolom, productsummary.
  - `BulkActionBar`: alleen als bulkacties echt nodig zijn.

**Donaties**
- Staff ziet alle batches en kan toewijzen.
- Componenten:
  - `DonationPipeline`
  - `AssignmentModal`
  - `PickupCalendarPreview`

**Planning**
- Doel verduidelijken: planning van pickups/leveringen/voorraad.
- Componenten:
  - `OperationsCalendar`
  - `UpcomingMilestones`
  - `CapacityLane`
- Als planning nu leeg of dun is: tijdelijk verbergen tot hij duidelijke waarde heeft.

**Voorraad**
- Staff ziet totaalbeeld.
- Componenten:
  - `StockHealthMatrix`
  - `InventoryMovementTimeline`
  - `LowStockAlerts`

**Prognose**
- Staff/admin, niet servicepartner/help_org.
- Componenten:
  - `ForecastTrendChart`
  - `DemandVsStockChart`
  - `ScenarioCards`
- Chartregels:
  - altijd legenda
  - datapunten/tooltip
  - tabelalternatief voor toegankelijkheid

**Rapportages**
- Staff/admin.
- Componenten:
  - `ReportCards`
  - `ExportButton`
  - `ImpactSummary`: vertaal cijfers naar missie, bijvoorbeeld “kinderen geholpen”.

**Organisaties**
- Staff/admin.
- Componenten:
  - `OrganizationDirectory`
  - `OrganizationTypeFilter`
  - `RelationshipHealthBadge`

**Locaties**
- Staff/admin, mogelijk servicepartner.
- Componenten:
  - `LocationCards`
  - `ServicePartnerMapList`

**Instellingen**
- Staff ziet:
  - eigen profiel
  - bestelvenster
  - productcatalogus
  - operationele configuratie
- Technische integraties alleen als staff ze beheert.

### Digidromen admin

Admin krijgt alles van staff plus:

| Nav label | Route | Pagina blijft? | UI-type |
|---|---|---:|---|
| Gebruikers | `/users` | ja | user management |
| Audit Log | `/audit-log` | ja, maar onder Beheer | technische audit |
| Integraties | `/crm-sync` | ja, hernoemen | CRM/outbox beheer |

Aanpassing:
- `CRM Sync` hernoemen naar `Integraties`.
- `Audit Log` niet als normale operationele pagina tonen; plaats onder navgroep `Beheer`.
- `Gebruikers` ook onder `Beheer`.

## Welke pagina's moeten weg of anders?

| Pagina | Beslissing | Reden |
|---|---|---|
| Dashboard | houden, per rol compleet anders | Iedere rol heeft startpunt nodig, maar met eigen metafoor |
| Bestellingen | houden, label per rol | Help_org: Aanvragen. Servicepartner: Uitleveringen. Staff/admin: Bestellingen |
| Donaties | houden, niet voor help_org | Operationele workflow voor staff/servicepartner |
| Planning | houden voor staff; servicepartner alleen als nuttig | Anders voelt het als lege admin |
| Voorraad | houden voor staff/servicepartner | Niet voor help_org |
| Prognose | houden voor staff/admin | Strategisch, niet werkvoorraad/klant |
| Rapportages | houden voor staff/admin | Managementinformatie |
| CRM Sync | uit hoofdnav; admin/staff integraties | Te technisch als hoofdpagina |
| Organisaties | houden voor staff/admin | Relatiebeheer |
| Gebruikers | admin-only | Beheer |
| Audit Log | admin-only, onder Beheer | Technisch |
| Locaties | staff/admin; servicepartner optioneel | Alleen als servicepartner er werk aan heeft |
| Instellingen | houden, per rol gefilterd | Iedereen heeft profiel/config nodig |

## Componentbibliotheek voor high-end Digidromen

Maak custom componenten in `portal/src/components/` of submappen zoals `components/surfaces`, `components/role`, `components/operations`.

Aanbevolen componenten:

- `RoleSurfaceLayout`
  - Kiest navgroepen, page title, CTA en dichtheid per rol.
- `DigidromenShell`
  - Sidebar/header met logo, rolbadge en warme Digidromen-stijl.
- `MissionHeroPanel`
  - Klantgerichte hero voor hulporganisaties.
- `CommandCenterHeader`
  - Staff/servicepartner header met belangrijkste actie en signalen.
- `BentoMetricGrid`
  - High-end KPI grid met missiecopy en iconen.
- `RequestCheckoutStepper`
  - Webshopachtige aanvraagflow.
- `ProductScenarioCard`
  - Visuele productkeuze met iconen, status en vereisten.
- `FriendlyStatusTracker`
  - Statuslijn voor hulporganisaties.
- `OperationalStatusRail`
  - Compacte status/actie rail voor staff/servicepartner.
- `DonationKanban`
  - Pipeline voor donatiebatchstatussen.
- `WarehouseTaskQueue`
  - Takenlijst voor servicepartner.
- `StockHealthMatrix`
  - Voorraadmatrix met lage voorraad/gereserveerd/beschikbaar.
- `ApprovalInbox`
  - Accorderingsinbox voor Digidromen.
- `ImpactSummaryCard`
  - Vertaling van operationele data naar maatschappelijke impact.
- `IntegrationHealthCard`
  - Voor CRM/outbox status.

Componentregels:
- Gebruik Lucide iconen.
- Geen nested cards; alleen cards voor echte items/panels.
- Geen kleur als enige statusindicator; altijd label/icon erbij.
- Maak knoppen en tabs minimaal 44px hoog.
- Gebruik consistente `rounded-[20px]` voor primaire knoppen en `rounded-xl`/`rounded-2xl` voor panelen.
- Row hover mag subtiel, geen layout shift.

## Architectuurvoorstel zonder extra complexiteit

Maak één kleine module:

`portal/src/lib/roleSurface.ts`

Deze module bevat alleen declaratieve config:

```ts
export type SurfaceKind = "customer" | "warehouse" | "operations" | "admin";

export const roleSurface = {
  help_org: {
    kind: "customer",
    homeLabel: "Start",
    orderLabel: "Aanvragen",
    nav: ["dashboard", "orders", "settings"],
  },
  service_partner: {
    kind: "warehouse",
    homeLabel: "Werkvoorraad",
    orderLabel: "Uitleveringen",
    nav: ["dashboard", "orders", "donations", "inventory", "stockLocations", "settings"],
  },
  digidromen_staff: {
    kind: "operations",
    homeLabel: "Regie",
    orderLabel: "Bestellingen",
    nav: ["dashboard", "orders", "donations", "planning", "inventory", "forecast", "reports", "organizations", "stockLocations", "settings"],
  },
  digidromen_admin: {
    kind: "admin",
    homeLabel: "Regie",
    orderLabel: "Bestellingen",
    nav: ["dashboard", "orders", "donations", "planning", "inventory", "forecast", "reports", "organizations", "stockLocations", "settings", "users", "integrations", "auditLog"],
  },
} as const;
```

Gebruik dit voor:
- `App.tsx` routeguards
- `Layout.tsx` navigatie
- dashboardvariant
- paginatitels
- primaire CTA-labels

Niet doen:
- Geen tweede router.
- Geen aparte app per rol.
- Geen nieuwe component library.
- Geen Next.js of SSR.

## Visuele richting per rol

### Customer surface

Stijl:
- warmer, rustiger, minder tabelachtig.
- grote primaire actie.
- cards met zachte beige/witte oppervlakken.
- korte empathische copy.

Voorbeeldcopy:
- `Laptop aanvragen`
- `Bekijk je aanvraag`
- `Samen zorgen we dat kinderen digitaal mee kunnen doen.`

### Warehouse surface

Stijl:
- compact, actiegericht, mobile-first.
- statuskolommen en taken.
- grotere tap targets.
- minder missiecopy, meer “wat moet nu”.

Voorbeeldcopy:
- `Te ontvangen`
- `Pickup plannen`
- `Markeren als ontvangen`
- `Voorraad bijwerken`

### Operations surface

Stijl:
- data-dense maar warm.
- bento-grid voor signalen.
- tabellen met goede filtering.
- accordering en uitzonderingen prominent.

Voorbeeldcopy:
- `Accordering nodig`
- `Operationele signalen`
- `Open donaties`
- `Voorraadknelpunten`

### Admin surface

Stijl:
- technisch beheer duidelijk gescheiden.
- audit/gebruikers/integraties onder navgroep `Beheer`.
- minder visuele warmte nodig, maar nog steeds Digidromen tokens.

## Acceptatiecriteria

Functioneel:
- Help_org kan alleen customer surface zien.
- Servicepartner ziet werkvoorraad, niet admin.
- Staff ziet regie, niet admin-only beheer.
- Admin ziet alles inclusief beheer.
- Directe routes volgen dezelfde regels als navigatie.

UI:
- Logo toont correct, geen wit blok.
- Help_org heeft geen operationele termen in hoofdflow.
- Primaire CTA is geel met donkergrijze tekst.
- Achtergrond is beige.
- Sora/Roboto zijn ingesteld of gepland in font import.
- Focus states zichtbaar.
- Geen horizontale scroll op 375px.
- Alle icon-only knoppen hebben aria-label.

Performance:
- Route lazy loading blijft.
- Geen zware chart libraries toevoegen zonder noodzaak.
- Skeletons blijven aanwezig bij data loading.

## Uitvoerprompt voor implementatie

Gebruik deze prompt voor de volgende Codex-run:

```text
Gebruik docs/2026-05-04-ui-ux-role-spec.md als bron van waarheid.

Doel:
Maak de Digidromen Portal rolgericht en high-end zonder de Vite/React/Supabase architectuur te verzwaren.

Constraints:
- Dit is Vite React, geen Next.js.
- Geen radicale functionele wijzigingen.
- Respecteer bestaande Supabase/RLS en roleguards.
- Hulporganisatie is klant/customer surface: alleen Start, Aanvragen, Mijn organisatie.
- Serviceorganisatie is warehouse surface: werkvoorraad, uitleveringen, donaties, voorraad, locaties, instellingen.
- Digidromen staff/admin zijn operations/admin surfaces.
- Digidromen branding is leidend: #FFD500 CTA, #EE7219 links/accent, #2E3848 tekst, #FBF4EB background, #87CEDC tertiair.
- Gebruik Sora voor headings en Roboto voor body.
- Gebruik Lucide iconen, geen emoji.
- Fix/handhaaf logo: echte asset, geen CSS invert/filter.

Implementatievolgorde:
1. Maak `portal/src/lib/roleSurface.ts` met declaratieve rolconfig voor nav, labels, routegroepen en surface kind.
2. Laat `Layout.tsx` en `App.tsx` die config gebruiken voor navigatie en routeguards.
3. Zet design tokens in `portal/src/index.css` en `portal/tailwind.config.js` gelijk aan Digidromen branding.
4. Bouw gedeelde high-end componenten:
   - `MissionHeroPanel`
   - `CommandCenterHeader`
   - `BentoMetricGrid`
   - `FriendlyStatusTracker`
   - `WarehouseTaskQueue`
   - `ApprovalInbox`
5. Pas Dashboard per rol aan:
   - help_org: customer startpagina met CTA naar nieuwe aanvraag en eigen aanvragen.
   - service_partner: warehouse werkvoorraad.
   - staff/admin: operations cockpit.
6. Pas Orders per rol aan:
   - help_org: `Aanvragen`, webshopachtige taal, minder kolommen.
   - service_partner: `Uitleveringen`, toegewezen orders.
   - staff/admin: `Bestellingen`, accordering en filters.
7. Filter Settings per rol zodat hulporganisaties geen admin/product/configsecties zien.
8. Controleer mobile 375px, keyboard focus, aria-labels, contrast en build.

Verificatie:
- `cd portal && npx tsc --noEmit && npm run build`
- Check dat help_org operationele routes niet in nav ziet en direct-route redirects krijgen.
- Check dat servicepartner geen admin routes ziet.
- Check dat admin beheeritems ziet.

Lever op:
- Korte changelog.
- Bestandslijst.
- Eventuele resterende UX-risico’s.
```
