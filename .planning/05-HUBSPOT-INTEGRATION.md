# HubSpot CRM Integratie

## Scope: v1 = Outbound-only

**v1 filosofie**: Begin eenvoudig. Outbound push van portal → HubSpot via het outbox-pattern. Bi-directionele sync is complex, breekbaar, en moeilijk te debuggen. We bouwen inbound webhooks pas als er een aantoonbare usecase is.

## Besluit: Supabase HubSpot wrapper is ondersteunend

De Supabase HubSpot wrapper is nuttig, maar niet als vervanger van de write-path in dit project.

- De wrapper geeft SQL-toegang tot HubSpot objecten als foreign tables.
- Voor de relevante objecten in deze flow is de wrapper read-only: goed voor `SELECT`, niet voor `INSERT` of `UPDATE`.
- Onze v1 use-case vereist juist gecontroleerde create/update-acties vanuit portal naar HubSpot.

Daarom geldt:

- `hubspot-sync` Edge Function blijft de enige write-path naar HubSpot.
- De wrapper is optioneel voor read-side use-cases zoals matching, inspectie, validatie en initiële koppeling.
- Dit voorkomt dat sync-logica verstopt raakt in FDW-configuratie en houdt retries, foutafhandeling en audittrail in eigen beheer.

```
Portal (Supabase)                    HubSpot CRM
─────────────────                    ──────────
              OUTBOUND (v1)
DB trigger → crm_sync_jobs → hubspot-sync Edge Fn → HubSpot API
             (outbox tabel)   (elke 5 min)           (REST v3)

              INBOUND (v2, later)
HubSpot Webhook → hubspot-webhook Edge Fn → Portal DB
```

---

## v1: Outbound Architectuur

### Wat er gesynchroniseerd wordt (outbound)

| Portal Event | HubSpot Object | Operatie |
|---|---|---|
| Nieuwe org aangemaakt | Company | Create |
| Order ingediend | Deal | Create (status: "Ingediend") |
| Order statuswijziging | Deal | Update property |
| Donatie ontvangen | Deal (custom) | Create/Update |
| Repair afgesloten | Ticket | Update |

### Outbox Pattern

DB triggers schrijven automatisch naar `crm_sync_jobs`:

```sql
-- Voorbeeld: order status → outbox
CREATE OR REPLACE FUNCTION public.order_crm_outbox_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.crm_sync_jobs (
      id, entity_type, entity_id, operation, payload, status, direction
    ) VALUES (
      gen_random_uuid()::text,
      'order',
      NEW.id,
      'update',
      jsonb_build_object('status', NEW.status, 'updated_at', NEW.updated_at),
      'pending',
      'outbound'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_crm_outbox
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.order_crm_outbox_fn();
```

Vergelijkbare triggers op: `organizations` (INSERT), `donation_batches` (UPDATE status), `repair_cases` (UPDATE status).

### `hubspot-sync` Edge Function

Verwerkt de outbox queue elke 5 minuten:

1. `SELECT * FROM crm_sync_jobs WHERE status = 'pending' AND direction = 'outbound' ORDER BY created_at LIMIT 50`
2. Groepeer per HubSpot object type
3. Gebruik HubSpot Batch API (max 100 per call)
4. Update status → `completed` of `failed`
5. Bij `failed`: increment `retry_count`, exponential backoff
6. Na 5 failures: `dead_letter` + notificatie

### Optionele HubSpot wrapper voor read-side queries

Gebruik de wrapper alleen voor ondersteunende read-only taken:

- bestaande HubSpot Companies/Deals matchen met portal-data
- mislukte syncs analyseren vanuit SQL
- handmatige of eenmalige migratiecontroles

Niet gebruiken voor:

- outbound writes
- retry-logica
- business rules rond sync-status

### Retry strategie

| Poging | Wacht |
|---|---|
| 1 | 1 minuut |
| 2 | 5 minuten |
| 3 | 15 minuten |
| 4 | 1 uur |
| 5 | 4 uur |
| > 5 | `dead_letter` |

---

## HubSpot API Details

### Authenticatie
Private App Token (niet OAuth — eenvoudiger voor server-to-server):
- Scope: `crm.objects.contacts.read/write`, `crm.objects.deals.read/write`, `crm.objects.companies.read/write`
- Token als Supabase Edge Function secret: `HUBSPOT_ACCESS_TOKEN`

### Endpoints (v3)
```
POST   https://api.hubapi.com/crm/v3/objects/companies
PATCH  https://api.hubapi.com/crm/v3/objects/companies/{id}
POST   https://api.hubapi.com/crm/v3/objects/deals
PATCH  https://api.hubapi.com/crm/v3/objects/deals/{id}
POST   https://api.hubapi.com/crm/v3/objects/companies/batch/update
```

### Rate Limits
- 100 requests / 10 seconden (Private App)
- Batch endpoints: max 100 records per call
- `hubspot-sync` gebruikt batch-calls en throttling

---

## CRM Sync Dashboard (CrmSync.tsx)

Bestaande pagina uitbreiden met:
- Overzicht sync status: pending / completed / failed / dead_letter aantallen
- Lijst van `failed` en `dead_letter` jobs met error_message
- Knop: "Retry failed" (herstart jobs met retry_count reset)
- Knop: "Sync nu" (on-demand trigger van hubspot-sync)
- Sync health: tijdstip laatste geslaagde sync

---

## Initiële Koppeling

Bij eerste activering:
1. Activeer optioneel de HubSpot wrapper als read-only bron in Supabase
2. Match bestaande HubSpot Companies/Deals op naam/email met `organizations`
3. Vul `crm_hubspot_id` in op gematchte records (handmatig via CSV, SQL of admin tool)
4. Niet-gematchte records: via CRM Sync pagina handmatig koppelen

---

## v2 Scope (pas later, indien nodig)

Inbound webhooks zijn complex en breekbaar:
- Signature verificatie (HMAC-SHA256)
- Idempotency (HubSpot kan dubbele webhooks sturen)
- Field ownership conflicten (welk systeem "wint"?)
- Verhoogde security surface

**Bouwen alleen als**: er een concrete usecase is waarbij CRM-eigenaren data moeten pushen naar de portal (bijv. partner-status updates door account managers).

### Als v2 toch nodig is, voeg toe:
- `hubspot-webhook` Edge Function
- `HUBSPOT_WEBHOOK_SECRET` als secret
- `direction = 'inbound'` records in crm_sync_jobs
- `crm_field_ownership` config in portal_config
