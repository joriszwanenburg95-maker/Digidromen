-- Uitbreiding: repair_cases zelfde default-servicepartner-logica + backfill alle rijen FK-veilig.
-- Idempotent: alleen rijen met NULL worden gezet; alleen als org uit portal_config bestaat in organizations.

DROP TRIGGER IF EXISTS trg_repair_cases_default_service_partner ON public.repair_cases;
CREATE TRIGGER trg_repair_cases_default_service_partner
  BEFORE INSERT OR UPDATE ON public.repair_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_default_assigned_service_partner();

-- FK-veilige backfill (orders, donaties, reparaties): alle bestaande NULL → default uit config
WITH cfg AS (
  SELECT (value #>> '{}')::text AS org_id
  FROM public.portal_config
  WHERE key = 'default_service_partner_organization_id'
)
UPDATE public.orders o
SET assigned_service_partner_id = cfg.org_id
FROM cfg
INNER JOIN public.organizations org ON org.id = cfg.org_id
WHERE o.assigned_service_partner_id IS NULL;

WITH cfg AS (
  SELECT (value #>> '{}')::text AS org_id
  FROM public.portal_config
  WHERE key = 'default_service_partner_organization_id'
)
UPDATE public.donation_batches d
SET assigned_service_partner_id = cfg.org_id
FROM cfg
INNER JOIN public.organizations org ON org.id = cfg.org_id
WHERE d.assigned_service_partner_id IS NULL;

WITH cfg AS (
  SELECT (value #>> '{}')::text AS org_id
  FROM public.portal_config
  WHERE key = 'default_service_partner_organization_id'
)
UPDATE public.repair_cases r
SET assigned_service_partner_id = cfg.org_id
FROM cfg
INNER JOIN public.organizations org ON org.id = cfg.org_id
WHERE r.assigned_service_partner_id IS NULL;
