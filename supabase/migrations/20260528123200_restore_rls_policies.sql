-- Herstel-migratie: forceert idempotent de RLS-policies + triggers uit
-- 20260416180000, 20260416230000 en 20260504163000 die nooit echt liepen.

-- ============================================================
-- 20260416180000: help_org workflow_events insert
-- ============================================================
DROP POLICY IF EXISTS "help org insert own order workflow events" ON public.workflow_events;
CREATE POLICY "help org insert own order workflow events"
  ON public.workflow_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_app_role() = 'help_org'
    AND case_type = 'order'
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = case_id
        AND o.organization_id = public.current_organization_id()
    )
  );

-- ============================================================
-- 20260416230000: help_org update own profile + escalation trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_user_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.role IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'Je mag alleen naam, telefoon en aanvullende velden van je eigen profiel wijzigen.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_privilege_escalation();

DROP POLICY IF EXISTS "users update own profile" ON public.user_profiles;
CREATE POLICY "users update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- 20260504163000: help_org storefront RLS
-- ============================================================
DROP POLICY IF EXISTS "authenticated read organizations" ON public.organizations;
CREATE POLICY "authenticated read organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR id = public.current_organization_id()
  );

DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;
CREATE POLICY "users read profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated read inventory" ON public.inventory_items;
CREATE POLICY "authenticated read inventory"
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
  );

DROP POLICY IF EXISTS "authenticated read orders" ON public.orders;
CREATE POLICY "authenticated read orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR (
      public.current_app_role() = 'help_org'
      AND organization_id = public.current_organization_id()
    )
  );

DROP POLICY IF EXISTS "authenticated read order lines" ON public.order_lines;
CREATE POLICY "authenticated read order lines"
  ON public.order_lines
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND public.current_app_role() = 'help_org'
        AND o.organization_id = public.current_organization_id()
    )
  );

DROP POLICY IF EXISTS "authenticated read repairs" ON public.repair_cases;
CREATE POLICY "authenticated read repairs"
  ON public.repair_cases
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
  );

DROP POLICY IF EXISTS "authenticated read donations" ON public.donation_batches;
CREATE POLICY "authenticated read donations"
  ON public.donation_batches
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
  );

DROP POLICY IF EXISTS "authenticated read workflow events" ON public.workflow_events;
CREATE POLICY "authenticated read workflow events"
  ON public.workflow_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE case_type = 'order'
        AND o.id = case_id
        AND public.current_app_role() = 'help_org'
        AND o.organization_id = public.current_organization_id()
    )
  );

DROP POLICY IF EXISTS "authenticated read messages" ON public.messages;
CREATE POLICY "authenticated read messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE case_type = 'order'
        AND o.id = case_id
        AND public.current_app_role() = 'help_org'
        AND o.organization_id = public.current_organization_id()
    )
  );

DROP POLICY IF EXISTS "authenticated read documents" ON public.documents;
CREATE POLICY "authenticated read documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE case_type = 'order'
        AND o.id = case_id
        AND public.current_app_role() = 'help_org'
        AND o.organization_id = public.current_organization_id()
    )
  );
