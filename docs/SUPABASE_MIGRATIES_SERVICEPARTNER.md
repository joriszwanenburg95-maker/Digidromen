# Servicepartner-default migraties (handmatig uitvoeren)

Deze migraties zorgen dat **alle orders en donaties** (en **repair cases**) een `assigned_service_partner_id` krijgen — standaard **Aces Direct** (`org-aces-direct`), configureerbaar via `portal_config.default_service_partner_organization_id`.

**Supabase project-ref (Digidromen):** `oyxcwfozoxlgdclchden`

## Optie A — Aanbevolen: Supabase CLI

Vanaf de root van deze repo, met een account dat toegang heeft tot het project:

```bash
# Eenmalig: CLI login
supabase login

# Koppel aan het remote project
supabase link --project-ref oyxcwfozoxlgdclchden

# Draai alle nog niet toegepaste migraties uit supabase/migrations/
supabase db push
```

Als `link` om een **database password** vraagt: vind je die in Supabase Dashboard → Project Settings → Database (connection string / reset password).

## Optie B — Zonder CLI: SQL Editor in het dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **Digidromen** → **SQL Editor**.
2. Voer de inhoud van de migratiebestanden **in volgorde van bestandsnaam** uit, minstens:
   - `supabase/migrations/20260421115000_fix_donation_triggers_legacy_enum.sql` — **eerst** (lost `invalid input value for enum donation_status: "OP_VOORRAAD"` op bij updates op `donation_batches`)
   - `supabase/migrations/20260421120000_default_service_partner.sql`
   - `supabase/migrations/20260421200000_default_service_partner_repair_fk_safe_backfill.sql`
3. Voer elk bestand in één keer uit (of plak ze achter elkaar in één run).

**Let op:** `apply_default_assigned_service_partner` wordt in `20260421120000` aangemaakt; `20260421200000` veronderstelt dat die functie bestaat.

### Fout: `OP_VOORRAAD` / enum `donation_status`

Oorzaak: oude triggerfuncties vergeleken nog met pre-redesign statusnamen. Voer **`20260421115000_fix_donation_triggers_legacy_enum.sql`** uit (via `db push` of handmatig), daarna opnieuw de servicepartner-migraties.

## Controleren na uitvoer

In SQL Editor:

```sql
-- Moet 0 zijn (geen orders zonder servicepartner)
SELECT count(*) AS orders_zonder_sp
FROM public.orders
WHERE assigned_service_partner_id IS NULL;

-- Moet 0 zijn
SELECT count(*) AS donaties_zonder_sp
FROM public.donation_batches
WHERE assigned_service_partner_id IS NULL;

-- Moet 0 zijn
SELECT count(*) AS repairs_zonder_sp
FROM public.repair_cases
WHERE assigned_service_partner_id IS NULL;

-- Standaard in config
SELECT key, value
FROM public.portal_config
WHERE key = 'default_service_partner_organization_id';
```

## Aces-org ontbreekt in de database

Als de backfill **0 rijen** bijwerkt en `org-aces-direct` bestaat niet in `organizations`, voer dan de seed/migratie uit die Aces aanmaakt (bijv. `20260409100000_test_users_and_model_improvements.sql` — alleen het relevante deel of de volledige migratiehistorie via `db push`).

## Standaard later wijzigen

Update de JSON-waarde in `portal_config` (als `digidromen_admin` via app/SQL). Nieuwe rijen met `NULL` krijgen dan automatisch die org via de triggers.
