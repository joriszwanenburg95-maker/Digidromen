-- Help-organisaties gebruiken de portal als bestelomgeving.
-- Digidromen-rollen en servicepartner behouden brede operationele leesrechten.

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
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
    OR auth_user_id = auth.uid()
  );

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

DROP POLICY IF EXISTS "authenticated read notifications" ON public.notifications;
CREATE POLICY "authenticated read notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_or_admin()
    OR public.current_app_role() = 'service_partner'
  );
