-- Default servicepartner (Aces Direct) voor orders en donatiebatches wanneer geen toewijzing is gezet.
-- Configureerbaar via portal_config zodat later meerdere servicepartners mogelijk blijven.

INSERT INTO public.portal_config (key, value)
VALUES (
  'default_service_partner_organization_id',
  to_jsonb('org-aces-direct'::text)
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_default_assigned_service_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  default_id text;
BEGIN
  IF NEW.assigned_service_partner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT (value #>> '{}')::text INTO default_id
  FROM public.portal_config
  WHERE key = 'default_service_partner_organization_id'
  LIMIT 1;

  IF default_id IS NOT NULL AND length(trim(default_id)) > 0 THEN
    NEW.assigned_service_partner_id := default_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_default_service_partner ON public.orders;
CREATE TRIGGER trg_orders_default_service_partner
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_default_assigned_service_partner();

DROP TRIGGER IF EXISTS trg_donation_batches_default_service_partner ON public.donation_batches;
CREATE TRIGGER trg_donation_batches_default_service_partner
  BEFORE INSERT OR UPDATE ON public.donation_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_default_assigned_service_partner();

-- Alle bestaande rijen zonder toewijzing → default (alleen als organisatie bestaat, FK-veilig)
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

COMMENT ON FUNCTION public.apply_default_assigned_service_partner() IS
  'Zet assigned_service_partner_id vanuit portal_config wanneer NULL (standaard Aces Direct).';
