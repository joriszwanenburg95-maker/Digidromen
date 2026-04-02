# Supabase Edge Functions (API Layer)

## Principe: Zo min mogelijk Edge Functions

**Vuistregel**: Als het via directe Supabase client + RLS kan, doe het daar. Edge Functions voegen latency, deployment-overhead en meer debugsurface toe.

| Actie | Aanpak | Waarom |
|---|---|---|
| Order indienen | Directe DB insert | RLS checkt venster-status en organisatie-autorisatie |
| Donatie ontvangst verwerken | Directe DB update + trigger | DB trigger update voorraad atomair |
| Rapporten exporteren | Client-side (xlsx library al aanwezig) | Geen server nodig, werkt offline |
| Vraagprognose | PostgreSQL View + materialized view | Geen Edge Function overhead, Postgres kan dit |
| Gebruikersbeheer | Edge Function met service_role | Heeft admin-rechten nodig buiten RLS |
| HubSpot sync | Edge Function (scheduled) | Externe API call, service_role key |
| Herinneringen / cron | Edge Function (scheduled) | Scheduled job, externe triggers |

## Edge Functions: 3 functies (was 7)

---

### 1. `admin-users` — Gebruikersbeheer (bestaand, uitbreiden)
**Status**: Actief in productie
**Trigger**: Frontend aanroep (admin UI)
**Acties**:
- `list` — Lijst alle gebruikers + profielen
- `create` → **wordt `inviteUserByEmail`** (magic link flow)
- `update-role` — Rolwijziging
- `deactivate` — Deactiveer account

```typescript
// Bestaande code. Enige wijziging: 'create' actie omzetten:
case 'create': {
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { organization_id, role }
  });
  // ...
}
```

**Waarom Edge Function**: Vereist `SUPABASE_SERVICE_ROLE_KEY` — kan nooit vanuit de browser.

---

### 2. `hubspot-sync` — Outbound CRM Sync (nieuw)
**Status**: Nieuw
**Trigger**: Scheduled via pg_cron (elke 5 minuten) + on-demand via frontend
**Acties**:
- Lees `crm_sync_jobs WHERE status = 'pending' AND direction = 'outbound' ORDER BY created_at LIMIT 50`
- Per job: roep HubSpot API aan (Contact, Company, Deal)
- Update status → `completed` of `failed` met error_message
- Bij `failed`: increment `retry_count`, exponential backoff
- Respecteer rate limits (HubSpot: 100 calls/10sec, batch API voor bulk)

```typescript
// supabase/functions/hubspot-sync/index.ts
// Input: geen (scheduled) of { force: true } voor on-demand
// Output: { processed: N, failed: N }
```

**v1 scope**: Alleen outbound. Inbound webhooks zijn v2 — pas toevoegen als aantoonbaar nodig.

**Retry strategie**:
- Max 5 retries
- Backoff: 1min, 5min, 15min, 1hr, 4hr
- Na 5 failures: status → `dead_letter`, alert naar admin via notificaties

---

### 3. `reminder-cron` — Notificaties & Herinneringen (nieuw)
**Status**: Nieuw
**Trigger**: Scheduled dagelijks (pg_cron of Supabase Cron)
**Acties**:
- Check openstaande orders > 14 dagen zonder statuswijziging → notificatie aan beheerder
- Check bestelvenster opent → email aan alle actieve help_org contactpersonen
- Check low-stock thresholds (via `portal_config`) → alert in `notifications` tabel
- Check donaties zonder data-wipe certificaat > 7 dagen na ontvangst → herinnering warehouse
- Check nieuwe rapportage/certificaat upload op donatie → notificatie aan Digidromen

```typescript
// supabase/functions/reminder-cron/index.ts
// Schrijft records naar `notifications` tabel
// Stuur emails via Supabase Auth (invite email pattern) of Resend indien geconfigureerd
```

---

## Wat GEEN Edge Function meer is

### `order-submit` → Direct DB insert met RLS
De bestelvenster-check en voorraad-validatie zitten in RLS policies en DB constraints:

```sql
-- RLS policy op orders: INSERT alleen als venster open is
CREATE POLICY "orders_insert_window_open" ON orders FOR INSERT
  WITH CHECK (
    is_ordering_window_open(target_month)  -- functie leest portal_config
    AND organization_id = current_organization_id()
  );
```

Frontend doet gewoon:
```typescript
const { data, error } = await supabase
  .from('orders')
  .insert({ organization_id, target_month, status: 'ingediend', ... });
// RLS blokkeert automatisch als venster dicht is
```

V1 aanvullende guardrails:
- één order mag meerdere orderregels bevatten zodat pakket + defectvervanging samen in één bestelling passen
- conditionele validatie blijft primair in database/policies, niet alleen in frontend

### `donation-complete` → Direct DB update + trigger
DB trigger verwerkt voorraad-update atomair:

```sql
CREATE OR REPLACE FUNCTION process_donation_received()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Genereer batch_number, update inventory_items
  -- Schrijf audit_log record
  -- Schrijf crm_sync_jobs outbox record
  -- Blokkeer OP_VOORRAAD zonder verplichte rapportage-documenten
  RETURN NEW;
END;
$$;
```

### `reports-export` → Client-side met xlsx
De xlsx library is al een dependency. Gebruik die:

```typescript
import * as XLSX from 'xlsx';

const exportOrders = (orders: Order[]) => {
  const ws = XLSX.utils.json_to_sheet(orders.map(formatForExport));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  XLSX.writeFile(wb, `orders-${format(new Date(), 'yyyy-MM')}.xlsx`);
};
```

### `forecasting` → PostgreSQL View
Berekeningen in de DB, frontend leest alleen de view:

```sql
CREATE OR REPLACE VIEW demand_forecast AS
SELECT
  product_id,
  DATE_TRUNC('month', preferred_delivery_date) as month,
  AVG(quantity) as avg_demand,
  MAX(quantity) as peak_demand
FROM order_lines ol
JOIN orders o ON o.id = ol.order_id
WHERE o.created_at > NOW() - INTERVAL '6 months'
  AND o.status NOT IN ('geannuleerd')
GROUP BY product_id, DATE_TRUNC('month', preferred_delivery_date);
```

---

## Gedeelde Patronen

### Auth verificatie (herhaal admin-users pattern)
```typescript
// 1. Haal JWT uit Authorization header
// 2. Verifieer user via callerClient.auth.getUser()
// 3. Check role via adminClient query op user_profiles
// 4. Alleen doorgaan als rol klopt
```

### CORS Headers
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

## Environment Variables
Automatisch beschikbaar in Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Handmatig toevoegen (Supabase Dashboard → Edge Functions → Secrets):
- `HUBSPOT_ACCESS_TOKEN` — HubSpot private app token

## Deployment
```bash
supabase functions deploy admin-users
supabase functions deploy hubspot-sync
supabase functions deploy reminder-cron
```
