# Architectuur

## Systeemoverzicht

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (CDN + Hosting)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Vite + React SPA                      │  │
│  │  React Router v7 │ Tailwind 4.2 │ Lucide          │  │
│  │  TanStack Query v5 (server state, caching)         │  │
│  │  Supabase JS Client (directe DB calls via RLS)     │  │
│  │  Supabase Realtime (live updates via invalidation) │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │ HTTPS                        │
└───────────────────────────┼──────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│                    Supabase Platform                      │
│                           │                               │
│  ┌────────────────────────▼──────────────────────────┐   │
│  │              Edge Functions (Deno) — 3 functies     │   │
│  │  admin-users (bestaand) │ hubspot-sync (scheduled) │   │
│  │  reminder-cron (scheduled)                          │   │
│  └────────────────────────┬──────────────────────────┘   │
│                           │                               │
│  ┌────────────────────────▼──────────────────────────┐   │
│  │              PostgreSQL + RLS                       │   │
│  │  Auth │ Storage │ Realtime │ pg_cron                │   │
│  │  14+ tabellen met Row Level Security                │   │
│  │  Audit triggers │ CRM outbox │ Forecast view        │   │
│  │  Gegenereerde TypeScript types (supabase gen types) │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Supabase Storage                       │   │
│  │  Bucket: documents (private)                        │   │
│  │  Certificaten │ Connector foto's │ Documenten       │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
                            │
                            │ REST API (outbox, outbound-only v1)
                            ▼
┌───────────────────────────────────────────────────────────┐
│                    HubSpot CRM                             │
│  Contacts │ Companies │ Deals │ Tickets                    │
│  v1: Outbound push only (portal → HubSpot)                 │
│  v2: Inbound webhooks (HubSpot → portal) indien nodig      │
│  Field Ownership: CRM leidt partnerstatussen               │
│                   Portal leidt adressen & operationeel     │
└───────────────────────────────────────────────────────────┘
```

## Data Fetching Architectuur

### Probleem met de huidige aanpak
`portal.ts` en `portal-remote.ts` (samen ~2000 regels) laden **alle** data bij sessiestart in één context. Dit werkt nu, maar schaalt slecht:
- 50 orders → OK
- 500 orders → haperig
- 5000 orders → onbruikbaar

Bovendien is `portal-remote.ts` een custom ORM die het schema nabootst — elke DB-migratie moet ook handmatig gesynchroniseerd worden.

### Nieuwe aanpak: TanStack Query + directe Supabase calls

Elke pagina haalt precies op wat het nodig heeft, gefilterd op de DB, gecached, met achtergrond-refetch:

```typescript
// src/lib/queryKeys.ts — centraal querykey factory
export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    byLocation: (locationId: string) => ['inventory', locationId] as const,
  },
  // etc.
};

// In een pagina — haalt alleen op wat nodig is
const { data: orders } = useQuery({
  queryKey: queryKeys.orders.list({ status: 'open', orgId: user.organizationId }),
  queryFn: () => supabase
    .from('orders')
    .select('id, status, priority, preferred_delivery_date, organizations(name)')
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .limit(50),
});
```

### Supabase Realtime → cache invalidatie
Warehouse bevestigt ontvangst → help org ziet status direct zonder F5:

```typescript
// src/lib/realtime.ts
supabase
  .channel('orders-changes')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'orders' },
    () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
  )
  .subscribe();
```

### Gegenereerde TypeScript types
Elimineert een hele categorie handmatig-bijgehouden type bugs:
```bash
supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```
Dit commando draait bij elke schema-wijziging. `portal-remote.ts` verdwijnt grotendeels.

## Datamodel (Nieuw)

### Bestaande tabellen (worden uitgebreid)

**organizations** — Alle organisaties
- Bestaande kolommen blijven
- TOEVOEGEN: `crm_hubspot_id TEXT`, `address TEXT`, `postal_code TEXT`, `city TEXT`
- TOEVOEGEN: `contact_name TEXT`, `contact_email TEXT`, `contact_phone TEXT`, `contact_mobile TEXT`
- V1 keuze: donoren worden ook als `organizations` opgeslagen (`type = 'sponsor'`), zonder portal-login

**products** — Producten & hardware pakketten
- Bestaande kolommen blijven
- TOEVOEGEN: `age_group TEXT[]` (bijv. `['6-12']`, `['12-18']`, `['6-18']`)
- TOEVOEGEN: `is_package BOOLEAN DEFAULT false`
- TOEVOEGEN: `package_components JSONB` (bijv. `[{"product_id": "prod-muis", "quantity": 1}]`)

**inventory_items** — Voorraad per locatie
- Bestaande kolommen blijven
- TOEVOEGEN: `stock_location_id TEXT FK → stock_locations`
- `warehouse_location` TEXT wordt deprecated (data migreren)

**orders** — Bestellingen
- Bestaande kolommen blijven
- TOEVOEGEN: `target_month DATE` (doelmaand)
- TOEVOEGEN: `actual_delivery_date DATE`
- TOEVOEGEN: `ordering_window_ref TEXT`
- TOEVOEGEN: `approved_at TIMESTAMPTZ`
- TOEVOEGEN: `approved_by_user_id TEXT`
- TOEVOEGEN: `scheduled_delivery_date DATE`

**order_lines** — Bestelregels
- Bestaande kolommen blijven
- TOEVOEGEN: `line_type TEXT DEFAULT 'new_request'` ('new_request' | 'rma_defect')
- TOEVOEGEN: `serial_number TEXT`
- TOEVOEGEN: `defect_description TEXT`
- TOEVOEGEN: `defect_photo_urls TEXT[]`
- TOEVOEGEN: `connector_type TEXT` (voor voedingskabels)
- TOEVOEGEN: `connector_wattage TEXT`
- TOEVOEGEN: `rma_category TEXT` ('laptop' | 'voedingskabel' | 'randapparatuur')
- V1 validatieregel:
  - `rma_category = 'laptop'` vereist `serial_number` + `defect_description`
  - `rma_category = 'voedingskabel'` vereist ofwel (`connector_type` + `connector_wattage`) ofwel (`defect_photo_urls` met aansluiting + adapterlabel) plus `serial_number`
  - overige defecte accessoires vereisen minimaal een korte `defect_description`

**donation_batches** — Donaties
- Bestaande kolommen blijven
- TOEVOEGEN: `pickup_date DATE`
- TOEVOEGEN: `batch_number TEXT UNIQUE`
- TOEVOEGEN: `shipment_reference TEXT`
- TOEVOEGEN: `total_weight_kg NUMERIC`
- TOEVOEGEN: `data_wipe_certificate_url TEXT`
- TOEVOEGEN: `certificate_uploaded_at TIMESTAMPTZ`
- TOEVOEGEN: `residual_value_eur NUMERIC`
- TOEVOEGEN: `invoiced BOOLEAN DEFAULT false`
- TOEVOEGEN: `invoice_notified BOOLEAN DEFAULT false`
- TOEVOEGEN: `thank_you_email_sent BOOLEAN DEFAULT false`
- TOEVOEGEN: `received_laptops INT DEFAULT 0`
- TOEVOEGEN: `received_mice INT DEFAULT 0`
- TOEVOEGEN: `received_headsets INT DEFAULT 0`
- TOEVOEGEN: `received_bags INT DEFAULT 0`
- TOEVOEGEN: `received_chargers INT DEFAULT 0`
- TOEVOEGEN: `received_other INT DEFAULT 0`
- TOEVOEGEN: `pickup_scheduled_at TIMESTAMPTZ`
- TOEVOEGEN: `picked_up_at TIMESTAMPTZ`
- TOEVOEGEN: `processed_at TIMESTAMPTZ`
- V1 fallback: status `RAPPORTAGE_GEREED` of hoger vereist rapportage-document; `OP_VOORRAAD` vereist rapportage plus certificaat of expliciete admin-override

**crm_sync_jobs** — Evolueert naar outbox
- Bestaande kolommen blijven
- TOEVOEGEN: `direction TEXT DEFAULT 'outbound'` ('outbound' | 'inbound')
- TOEVOEGEN: `hubspot_object_type TEXT`
- TOEVOEGEN: `hubspot_object_id TEXT`
- TOEVOEGEN: `field_changes JSONB`

### Nieuwe tabellen

**stock_locations** — Fysieke voorraadlocaties
```
id TEXT PK
name TEXT NOT NULL
organization_id TEXT FK → organizations
address TEXT
city TEXT
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**repair_logs** — Reparatie-uitkomsten
```
id TEXT PK
repair_case_id TEXT FK → repair_cases
repair_successful BOOLEAN NOT NULL
cost_per_unit_eur NUMERIC
reason_unrepairable TEXT
parts_used JSONB
invoiced BOOLEAN DEFAULT false
technician_notes TEXT
created_at TIMESTAMPTZ
```

**audit_log** — Alle statuswijzigingen
```
id TEXT PK
table_name TEXT NOT NULL
record_id TEXT NOT NULL
action TEXT NOT NULL (insert/update/delete)
user_id TEXT
user_email TEXT
old_value JSONB
new_value JSONB
created_at TIMESTAMPTZ DEFAULT now()
```

**portal_config** — Systeemconfiguratie
```
key TEXT PK
value JSONB NOT NULL
updated_at TIMESTAMPTZ DEFAULT now()
```
Seed: bestelvensters, low-stock thresholds, email templates
- V1 houdt configuratie beperkt tot een klein aantal harde operationele regels; geen generieke workflow-builder

**forecast_snapshots** — Prognose-data
```
id TEXT PK
generated_at TIMESTAMPTZ
horizon_months INT
data JSONB
created_at TIMESTAMPTZ
```

### Enum Uitbreidingen

Nieuwe enums:
- `rma_category`: 'laptop', 'voedingskabel', 'randapparatuur'
- `order_line_type`: 'new_request', 'rma_defect'
- `inventory_status`: 'inkomend_donatie', 'inkomend_defect', 'uitgaand_gereserveerd', 'beschikbaar'

Document kind uitbreiden:
- TOEVOEGEN: 'data_wipe_certificate', 'connector_photo', 'invoice'

## Security Model

### Authenticatie: Magic Link
- Geen wachtwoorden — alleen email-gebaseerde magic links
- Supabase Auth `signInWithOtp({ email })` 
- Gebruikers worden vooraf aangemaakt door admin (invite flow)
- Na klik op magic link → automatisch ingelogd + sessie
- Fallback: admin kan opnieuw uitnodigen

### Autorisatie: RLS + RBAC
Bestaand RLS-patroon wordt behouden en uitgebreid:
- `current_app_role()`, `current_organization_id()`, `is_staff_or_admin()`, `is_admin()` functies
- Verwerker ziet alleen toegewezen orders/donaties/eigen locatie-voorraad
- Aanvrager ziet alleen eigen organisatie-data
- Beheerder ziet alles

### Nieuwe RLS Policies
- `stock_locations`: service_partner ziet alleen `organization_id = current_organization_id()`
- `repair_logs`: staff/admin + assigned service_partner van de repair_case
- `audit_log`: alleen admin leesbaar
- `portal_config`: iedereen leesbaar, alleen admin schrijfbaar
- `forecast_snapshots`: iedereen leesbaar

## Status Flows

### Order Status (bestaand, display labels wijzigen)
```
INGEDIEND          → "Wacht op Accordering" (aanvrager) / "Nieuw" (beheerder)
  ↓
BEOORDEELD         → "Geaccordeerd"
  ↓
IN_BEHANDELING     → "Toegewezen aan Verwerker"
  ↓
IN_VOORBEREIDING   → "In Voorbereiding"
  ↓
VERZONDEN          → "Verzonden"
  ↓
GELEVERD           → "Bezorgd"
  ↓
AFGESLOTEN         → "Afgesloten"

GEANNULEERD        → "Geannuleerd" (vanuit elke status)
```

V1 aanvullende regels:
- Alleen `digidromen_staff` of `digidromen_admin` kan accorderen
- `BEOORDEELD` zet `approved_at` en `approved_by_user_id`
- `VERZONDEN` of `GELEVERD` vereist `scheduled_delivery_date`
- Geleverde orders gaan in de klantweergave naar archief zodra status `GELEVERD` of `AFGESLOTEN` is

### Repair Status (bestaand, ongewijzigd)
```
ONTVANGEN → DIAGNOSE → IN_REPARATIE → TEST → RETOUR → AFGESLOTEN
                                            → IRREPARABEL → AFGESLOTEN
```

### Donation Status (bestaand, ongewijzigd)
```
TOEGEZEGD → OPHAALAFSPRAAK_GEPLAND → OPGEHAALD → AANGEKOMEN_WAREHOUSE
  → IN_VERWERKING → RAPPORTAGE_GEREED → OP_VOORRAAD
```

V1 aanvullende regels:
- `OPHAALAFSPRAAK_GEPLAND` vereist `pickup_date`
- Bij pickupplanning kan ook `shipment_reference` worden vastgelegd
- `RAPPORTAGE_GEREED` legt `processed_at` vast
- Datum van elke statuswijziging wordt gemeten via audittrail en waar relevant via expliciete datumvelden

## Operationele v1-besluiten

### Bestelvenster
- V1 gebruikt een eenvoudig kalenderbeleid uit `portal_config`
- Open van dag 22 t/m laatste dag van maand M, plus dag 1 t/m 7 van maand M+1
- Tijdens dit venster mag alleen besteld worden voor maand M+1
- Buiten venster mag een hulporganisatie geen nieuwe bestelling indienen
- UI toont alleen "open / gesloten / sluit op datum"

### Notificaties
- V1 ondersteunt alleen operationeel noodzakelijke notificaties:
  - bevestiging bij orderindiening naar hulporganisatie
  - bevestiging bij accordering naar hulporganisatie
  - bevestiging bij ingevulde bezorgdatum naar hulporganisatie
  - interne melding aan Digidromen bij statuswijziging op donatie, order of reparatie
  - maandelijkse bestelherinnering aan actieve hulporganisaties bij openen van het venster
- Complexe template-logica of kanaalorkestratie is fase 2

### Donor / CRM source of truth
- Portal is leidend voor operationele donatie-intake en batchafhandeling
- HubSpot is ondersteunend voor relatiebeheer en outbound sync
- Nieuwe donoren moeten in v1 in het portal kunnen worden aangemaakt door staff, ook als nog geen CRM-match bestaat

### Rapportage
- V1 levert één minimale maandrapportage op basis van de huidige Excel-uitdraai
- Scope: orders, leveringen, voorraadmutaties en donatie-uitkomsten per maand
- Extra rapportsoorten en vrije analyses zijn fase 2
