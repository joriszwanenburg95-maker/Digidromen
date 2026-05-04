# Supabase Migraties en Live Project

Laatste update: 2026-05-04

Supabase project-ref: `oyxcwfozoxlgdclchden`

## CLI

Vanaf de repo-root:

```bash
npx supabase link --project-ref oyxcwfozoxlgdclchden
npx supabase db push
```

Als de CLI geen toegang heeft:
- controleer Supabase-accountrechten op project `oyxcwfozoxlgdclchden`
- of zet tijdelijk `SUPABASE_DB_PASSWORD` voor de remote database
- print nooit tokens/passwords in logs of docs

## Huidige aandachtspunten

### RLS en login

`user_profiles` wordt gelezen tijdens auth bootstrap. Maak de SELECT-policy op `user_profiles` niet afhankelijk van `current_app_role()`, `current_organization_id()` of `is_staff_or_admin()`, omdat die helperfuncties zelf `user_profiles` lezen.

Veilige hotfix/baseline:

```sql
DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;

CREATE POLICY "users read profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);
```

Als de portal blijft hangen op `Portal laden...` direct na RLS-wijzigingen, controleer deze policy als eerste.

### Servicepartner default

Orders, donaties en repair cases gebruiken een default servicepartner via:

`portal_config.default_service_partner_organization_id`

Belangrijke migraties:
- `20260421115000_fix_donation_triggers_legacy_enum.sql`
- `20260421120000_default_service_partner.sql`
- `20260421200000_default_service_partner_repair_fk_safe_backfill.sql`

Controle na uitvoer:

```sql
SELECT count(*) AS orders_zonder_sp
FROM public.orders
WHERE assigned_service_partner_id IS NULL;

SELECT count(*) AS donaties_zonder_sp
FROM public.donation_batches
WHERE assigned_service_partner_id IS NULL;

SELECT count(*) AS repairs_zonder_sp
FROM public.repair_cases
WHERE assigned_service_partner_id IS NULL;

SELECT key, value
FROM public.portal_config
WHERE key = 'default_service_partner_organization_id';
```

## Types regenereren

Na schemawijziging:

```bash
npx supabase gen types typescript --project-id oyxcwfozoxlgdclchden > portal/src/types/database.ts
```

`portal/src/types/database.ts` is gegenereerd en wordt niet handmatig aangepast.
