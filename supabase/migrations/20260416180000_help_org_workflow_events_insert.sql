-- help_org mag workflow_events schrijven voor eigen orders (indienen bestelling).

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
