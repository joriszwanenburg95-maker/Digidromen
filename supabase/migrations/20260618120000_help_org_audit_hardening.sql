-- ════════════════════════════════════════════════════════════════════════
-- Hardening n.a.v. audit hulporganisatie-perspectief (customer-facing webshop).
--   1. help_org mag eigen orders NIET zelf accorderen/muteren (alleen
--      preferred_delivery_date). Guard-trigger i.p.v. brede UPDATE-policy.
--   2. Interne berichten (internal_only) niet zichtbaar voor help_org.
--   3. user_profiles SELECT org-gescope't zonder RLS-recursie (SECURITY DEFINER).
--   4. stock_locations niet leesbaar voor help_org.
--   5. Bestelvenster aan/uit via portal_config.ordering_windows.enabled.
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. help_org order-update guard
-- De bestaande UPDATE-policy ("order updates by staff own org or service
-- partner") liet help_org elke kolom van een eigen order wijzigen. Daardoor
-- kon een klant via een directe UPDATE status='geaccordeerd' zetten en de
-- accorderingsstap omzeilen. We houden de policy (org-scoping) maar voegen
-- een BEFORE UPDATE-guard toe die help_org beperkt tot preferred_delivery_date.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_help_org_order_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff/admin en service_partner vallen buiten deze guard.
  IF public.is_staff_or_admin() OR public.current_app_role() <> 'help_org' THEN
    RETURN NEW;
  END IF;

  -- help_org mag uitsluitend de gewenste leverdatum aanpassen. Elke andere
  -- gewijzigde kolom wordt geblokkeerd.
  IF NEW.status                     IS DISTINCT FROM OLD.status
     OR NEW.approval_status         IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at             IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by_user_id     IS DISTINCT FROM OLD.approved_by_user_id
     OR NEW.assigned_service_partner_id IS DISTINCT FROM OLD.assigned_service_partner_id
     OR NEW.delivery_date           IS DISTINCT FROM OLD.delivery_date
     OR NEW.delivery_date_changed_at IS DISTINCT FROM OLD.delivery_date_changed_at
     OR NEW.delivery_date_set_by    IS DISTINCT FROM OLD.delivery_date_set_by
     OR NEW.delivery_date_source    IS DISTINCT FROM OLD.delivery_date_source
     OR NEW.scheduled_delivery_date IS DISTINCT FROM OLD.scheduled_delivery_date
     OR NEW.actual_delivery_date    IS DISTINCT FROM OLD.actual_delivery_date
     OR NEW.archive_status          IS DISTINCT FROM OLD.archive_status
     OR NEW.organization_id         IS DISTINCT FROM OLD.organization_id
     OR NEW.priority                IS DISTINCT FROM OLD.priority
     OR NEW.requester_user_id       IS DISTINCT FROM OLD.requester_user_id
     OR NEW.requested_at            IS DISTINCT FROM OLD.requested_at
     OR NEW.created_at              IS DISTINCT FROM OLD.created_at
     OR NEW.stock_badge             IS DISTINCT FROM OLD.stock_badge
     OR NEW.target_month            IS DISTINCT FROM OLD.target_month
     OR NEW.ordering_window_ref     IS DISTINCT FROM OLD.ordering_window_ref
     OR NEW.delivery_address        IS DISTINCT FROM OLD.delivery_address
     OR NEW.motivation              IS DISTINCT FROM OLD.motivation
     OR NEW.crm_case_id             IS DISTINCT FROM OLD.crm_case_id
     OR NEW.crm_relation_id         IS DISTINCT FROM OLD.crm_relation_id
     OR NEW.crm_task_id             IS DISTINCT FROM OLD.crm_task_id
  THEN
    RAISE EXCEPTION 'Als hulporganisatie kun je alleen de gewenste leverdatum van je eigen bestelling aanpassen.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_help_org_order_mutation ON public.orders;
CREATE TRIGGER trg_prevent_help_org_order_mutation
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_help_org_order_mutation();

-- ────────────────────────────────────────────────────────────────────────
-- 2. Interne berichten afschermen voor help_org
-- De messages SELECT-policy scope'tte help_org al naar eigen-org orders, maar
-- filterde niet op internal_only. Interne notities van staff/servicepartner
-- waren daardoor zichtbaar voor de klant.
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated read messages" ON public.messages;
CREATE POLICY "authenticated read messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR (
      -- help_org: alleen niet-interne berichten op eigen-org orders.
      internal_only = false
      AND EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE case_type = 'order'
          AND o.id = case_id
          AND public.current_app_role() = 'help_org'
          AND o.organization_id = public.current_organization_id()
      )
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- 3. user_profiles SELECT org-gescope't (zonder RLS-recursie)
-- current_organization_id()/is_staff_or_admin() zijn STABLE (geen SECURITY
-- DEFINER) en lezen user_profiles → ze veroorzaken recursie in een
-- user_profiles-policy (zie AGENTS.md, daarom stond de policy op USING(true)).
-- Oplossing: SECURITY DEFINER-helpers die user_profiles lezen met RLS-bypass.
-- De eerste policy-tak (auth_user_id = auth.uid()) houdt de auth-bootstrap
-- werkend zonder enige functie-aanroep.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_org_id_sd()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.organization_id
  FROM public.user_profiles AS up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_staff_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS up
    WHERE up.auth_user_id = auth.uid()
      AND up.role IN ('digidromen_staff', 'digidromen_admin')
  )
$$;

DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;
CREATE POLICY "users read profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.current_user_is_staff_sd()
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.current_user_org_id_sd()
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- 4. stock_locations niet leesbaar voor help_org
-- De brede "authenticated read stock_locations" USING(true) verviel; staff
-- (via "staff manage", FOR ALL) en servicepartner (eigen locaties) behouden
-- hun leesrecht.
-- ────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated read stock_locations" ON public.stock_locations;
DROP POLICY IF EXISTS "staff read stock_locations" ON public.stock_locations;
CREATE POLICY "staff read stock_locations"
  ON public.stock_locations
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin());

-- ────────────────────────────────────────────────────────────────────────
-- 5. Bestelvenster aan/uit (portal_config.ordering_windows.enabled)
-- Default = aan (enabled ontbreekt of true). Staat enabled op false, dan is
-- het venster gesloten voor hulporganisaties, ongeacht de kalenderdagen, en
-- wordt force_open genegeerd.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_ordering_window_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  open_day int;
  close_day int;
  today_day int;
  forced boolean;
  enabled boolean;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  IF cfg IS NULL THEN RETURN true; END IF;

  enabled := coalesce((cfg->>'enabled')::boolean, true);
  IF NOT enabled THEN RETURN false; END IF;

  forced := coalesce((cfg->>'force_open_help_org')::boolean, false);
  IF forced THEN RETURN true; END IF;

  open_day  := (cfg->>'open_day')::int;
  close_day := (cfg->>'close_day')::int;
  today_day := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;

  RETURN today_day BETWEEN open_day AND close_day;
END;
$$;

DROP FUNCTION IF EXISTS public.check_ordering_window();
CREATE OR REPLACE FUNCTION public.check_ordering_window()
RETURNS TABLE(is_open boolean, open_day int, close_day int, today_day int, forced_open_help_org boolean, enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  o int;
  c int;
  t int;
  forced boolean;
  en boolean;
  cal_open boolean;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  o := coalesce((cfg->>'open_day')::int, 1);
  c := coalesce((cfg->>'close_day')::int, 7);
  t := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;
  forced := coalesce((cfg->>'force_open_help_org')::boolean, false);
  en := coalesce((cfg->>'enabled')::boolean, true);
  cal_open := (t BETWEEN o AND c);
  RETURN QUERY SELECT (en AND (cal_open OR forced)), o, c, t, forced, en;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ordering_window() TO authenticated;
