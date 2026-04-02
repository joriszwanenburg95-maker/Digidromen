# Frontend Herontwerp

## Overzicht
Herontwerp van alle portal-pagina's op basis van het PRD. De stack blijft Vite + React + Tailwind + Lucide. Bestaande pagina's worden uitgebreid, nieuwe pagina's worden toegevoegd.

## Data Fetching: TanStack Query

De bestaande `usePortalContext()` laadt alles in één keer. Dit vervangen we stapsgewijs met TanStack Query, zodat elke pagina alleen haalt wat het nodig heeft.

### Setup (eenmalig, Fase 3)

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minuten fresh
      gcTime: 1000 * 60 * 10,          // 10 minuten in cache
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Query Key Factory

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  donations: {
    all: ['donations'] as const,
    list: (filters: DonationFilters) => ['donations', 'list', filters] as const,
    detail: (id: string) => ['donations', 'detail', id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    byLocation: (locationId?: string) => ['inventory', locationId ?? 'all'] as const,
  },
  repairs: {
    all: ['repairs'] as const,
    list: (filters: RepairFilters) => ['repairs', 'list', filters] as const,
    detail: (id: string) => ['repairs', 'detail', id] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    detail: (id: string) => ['organizations', id] as const,
  },
};
```

### Realtime: live updates via invalidatie

```typescript
// src/lib/realtime.ts — initialiseer één keer in App.tsx
export function setupRealtimeListeners(queryClient: QueryClient) {
  const channel = supabase
    .channel('portal-changes')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'donation_batches' },
      () => queryClient.invalidateQueries({ queryKey: queryKeys.donations.all })
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_items' },
      () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

### Migratiestrategie

**Stapsgewijs per pagina** — de oude `usePortalContext()` blijft tijdelijk naast TanStack Query bestaan. Vervang per pagina; als alles overgezet is, verwijder de context.

1. `Dashboard.tsx` → TanStack Query voor KPI counts (meest impactvol, minst data)
2. `Orders.tsx` → gepagineerd, gefilterd
3. `OrderDetail.tsx` → single record + optimistic updates
4. Overige pagina's

### Gegenereerde TypeScript Types

Na elke schema-migratie uitvoeren:

```bash
supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```

Gebruik `Database['public']['Tables']['orders']['Row']` als basis voor alle types. `portal-remote.ts` verdwijnt grotendeels zodra alle pagina's overgezet zijn.

## Pagina Overzicht

### Bestaande pagina's (worden uitgebreid)

| Route | Component | Wijzigingen |
|---|---|---|
| `/login` | `Login.tsx` | Password-veld verwijderen → magic link flow (zie 03-AUTH) |
| `/dashboard` | `Dashboard.tsx` | KPI-kaarten, rol-specifieke widgets, alerts |
| `/orders` | `Orders.tsx` | Bestelvenster-indicator, filters per status/maand/org, archief-tab voor geleverde orders |
| `/orders/:id` | `OrderDetail.tsx` | Status flow, toewijzing, verzending, RMA sectie, geplande bezorgdatum |
| `/repairs` | `Repairs.tsx` | Filters, bulk-acties, export |
| `/repairs/:id` | `RepairDetail.tsx` | Repair log toevoegen, kostenregistratie |
| `/donations` | `Donations.tsx` | Ontvangst-flow, certificaat upload, nieuwe donor selecteren of aanmaken |
| `/donations/:id` | `DonationDetail.tsx` | Batch details, ontvangstaantallen, facturatie, ladingnummer, pickup-wijziging |
| `/inventory` | `Inventory.tsx` | Multi-locatie, low-stock alerts, transfer |
| `/reports` | `Reports.tsx` | Periode-selectie, minimale maandrapportage en export functionaliteit |
| `/crm-sync` | `CrmSync.tsx` | Sync status, handmatige koppeling, retry |
| `/settings` | `Settings.tsx` | Bestelvensters, thresholds, email templates |

### Nieuwe pagina's

| Route | Component | Beschrijving |
|---|---|---|
| `/users` | `Users.tsx` | Gebruikersbeheer (admin), invite via magic link |
| `/organizations` | `Organizations.tsx` | Organisatiebeheer voor hulporganisaties, donoren en HubSpot koppeling |
| `/organizations/:id` | `OrganizationDetail.tsx` | Org detail + gekoppelde orders/donaties |
| `/forecast` | `Forecast.tsx` | Vraagprognose dashboard |
| `/audit-log` | `AuditLog.tsx` | Audit trail viewer (admin only) |
| `/stock-locations` | `StockLocations.tsx` | Locatiebeheer voor voorraad |

### Routes toevoegen aan App.tsx
```typescript
// Nieuwe lazy imports
const Users = lazy(() => import("./pages/Users"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const Forecast = lazy(() => import("./pages/Forecast"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const StockLocations = lazy(() => import("./pages/StockLocations"));

// Nieuwe routes in <ProtectedLayout>
<Route path="/users" element={<Users />} />
<Route path="/organizations" element={<Organizations />} />
<Route path="/organizations/:id" element={<OrganizationDetail />} />
<Route path="/forecast" element={<Forecast />} />
<Route path="/audit-log" element={<AuditLog />} />
<Route path="/stock-locations" element={<StockLocations />} />
```

## Rol-gebaseerde Navigatie

### Layout.tsx Sidebar Aanpassing
De sidebar toont menu-items op basis van de gebruikersrol:

| Menu Item | `digidromen_admin` | `digidromen_staff` | `service_partner` | `help_org` |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Bestellingen | ✓ | ✓ | ✓ (toegewezen) | ✓ (eigen) |
| Reparaties | ✓ | ✓ | ✓ (toegewezen) | — |
| Donaties | ✓ | ✓ | ✓ (toegewezen) | — |
| Voorraad | ✓ | ✓ | ✓ (eigen locatie) | — |
| Prognose | ✓ | ✓ | — | — |
| Rapportages | ✓ | ✓ | — | — |
| CRM Sync | ✓ | ✓ | — | — |
| Organisaties | ✓ | ✓ | — | — |
| Gebruikers | ✓ | — | — | — |
| Audit Log | ✓ | — | — | — |
| Locaties | ✓ | ✓ | — | — |
| Instellingen | ✓ | — | — | — |

## Dashboard per Rol

### Admin/Staff Dashboard
```
┌──────────────────────────────────────────────────────┐
│ KPI Kaarten                                          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │Openst. │ │Nieuwe  │ │Voorraad│ │Donaties│        │
│ │Orders  │ │vandaag │ │laptops │ │deze mnd│        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                      │
│ ┌─────────────────────┐ ┌──────────────────────────┐│
│ │ Recente activiteit  │ │ Alerts                    ││
│ │ • Order #123 →      │ │ ⚠ Low stock: muizen (3) ││
│ │   verzonden          │ │ ⚠ 2 orders > 14 dagen  ││
│ │ • Donatie DON-045    │ │ ✓ Sync OK (5 min geleden)││
│ │   ontvangen          │ │                          ││
│ └─────────────────────┘ └──────────────────────────┘│
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Maandoverzicht (bar chart)                        ││
│ │ Orders per maand / Donaties per maand              ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Help Org Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Welkom, [Organisatie Naam]                            │
│                                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐                    │
│ │Lopende │ │Geleverd│ │Bestel- │                    │
│ │orders  │ │dit jaar│ │venster │                    │
│ └────────┘ └────────┘ └────────┘                    │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Mijn Bestellingen                                  ││
│ │ Status │ Datum │ Aantal │ Actie                    ││
│ │ ────── │ ───── │ ────── │ ─────                    ││
│ │ Verz.  │ 15-3  │ 20     │ Details →                ││
│ │ Nieuw  │ 28-3  │ 10     │ Details →                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [+ Nieuwe Bestelling] (als venster open is)          │
└──────────────────────────────────────────────────────┘
```

### Service Partner Dashboard
```
┌──────────────────────────────────────────────────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │Te verw.│ │In prep.│ │Reps    │ │Voorraad│        │
│ │orders  │ │       │ │open    │ │totaal  │        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                      │
│ ┌────────────────────┐ ┌───────────────────────────┐│
│ │ Toegewezen Orders  │ │ Openstaande Reparaties     ││
│ │ [tabel]            │ │ [tabel]                    ││
│ └────────────────────┘ └───────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Gedeelde Componenten

### Nieuwe componenten
| Component | Beschrijving |
|---|---|
| `StatusBadge.tsx` | Gekleurde badge voor elke status (order, repair, donation) |
| `KpiCard.tsx` | Herbruikbare KPI kaart met icoon, waarde, trend |
| `DataTable.tsx` | Generieke tabel met sortering, filtering, paginatie |
| `OrderForm.tsx` | Bestelformulier met productcatalogus en leeftijdsgroep |
| `FileUpload.tsx` | Drag & drop upload naar Supabase Storage |
| `ConfirmDialog.tsx` | Bevestigingsdialoog voor destructieve acties |
| `EmptyState.tsx` | Lege-staat placeholder met actie-knop |
| `AlertBanner.tsx` | Systeem-breed alert (bestelvenster, low stock) |
| `RoleGuard.tsx` | Wrapper component: render children alleen als gebruiker juiste rol heeft |

### V1 UX-besluiten
- `OrderForm.tsx` ondersteunt meerdere regels in één bestelling
- Voor defecte laptopregel: toon verplichte SRN + klachtomschrijving
- Voor defecte voedingskabelregel: toon keuze tussen handmatige specificatie of foto-upload
- Formulierconcepten worden lokaal bewaard zodat invoer niet direct verloren gaat bij schermwissel
- Adreslookup op basis van postcode + huisnummer is optioneel; handmatige invoer blijft altijd beschikbaar

### Bestaande componenten (behouden)
| Component | Status |
|---|---|
| `Layout.tsx` | Uitbreiden met rol-navigatie |
| `Timeline.tsx` | Behouden voor order/repair/donation detail |
| `ProductCatalog.tsx` | Behouden, uitbreiden met pakketten en leeftijdsgroepen |
| `CrmPreparationCard.tsx` | Behouden voor CRM sync pagina |
| `ErrorBoundary.tsx` | Behouden |

## Design Systeem

### Kleuren (Tailwind)
- **Primary**: Digidromen blauw (`blue-600` / `blue-700`)
- **Success**: `green-600` (geleverd, voltooid)
- **Warning**: `amber-500` (aandacht, vertraging)
- **Danger**: `red-600` (geannuleerd, fout)
- **Info**: `sky-500` (informatief)
- **Neutral**: `slate-*` (achtergrond, tekst)

### Status Kleuren
| Status | Kleur | Badge |
|---|---|---|
| Ingediend / Nieuw | `blue-100 text-blue-800` | Blauw |
| In behandeling | `amber-100 text-amber-800` | Oranje |
| In voorbereiding | `purple-100 text-purple-800` | Paars |
| Verzonden | `sky-100 text-sky-800` | Lichtblauw |
| Geleverd / Voltooid | `green-100 text-green-800` | Groen |
| Geannuleerd | `red-100 text-red-800` | Rood |
| Afgesloten | `slate-100 text-slate-800` | Grijs |

## Mobile-first voor Warehouse Flows

Warehouse medewerkers (Aces Direct) werken met tablet of telefoon, niet achter een desktop. De algemene portal mag desktop-first zijn, maar warehouse-specifieke flows moeten touch-vriendelijk zijn.

### Welke flows zijn warehouse-specifiek?
- **Donatie ontvangst bevestigen** (`/donations/:id` → ontvangst tab)
- **Repair log toevoegen** (`/repairs/:id` → log toevoegen)
- **Inventaris aanpassen** (snel +/- knoppen per item)

### Mobile design principes voor warehouse flows

```
Tap targets: minimaal 48×48px (geen kleine icoontjes als enige CTA)
Formulieren: één actie per scherm (wizard-stijl)
Bevestiging: grote, duidelijke "Bevestig ontvangst" knop — geen verstopt menu-item
Status badges: groot leesbaar op afstand
Aantallen: number input met +/- knoppen naast het veld
```

### Implementatie
- Geen aparte app of routes — responsive design binnen bestaande pagina's
- `md:` breakpoint voor desktop-layout, mobiel is de default
- `DonationReceiptForm` component: wizard met stap 1 (aantallen) → stap 2 (gewicht/certificaat) → stap 3 (bevestigen)
- `RepairLogForm` component: minimaal formulier, grote textarea, grote submit knop

### Typografie
- Headers: `font-semibold`
- Body: `font-normal`
- Monospace (IDs, codes): `font-mono text-sm`

### Spacing
- Pagina padding: `p-6`
- Card padding: `p-4`
- Tabel rijen: `py-3 px-4`
- Formulier velden: `space-y-4`
