-- Herstel-migratie: 20260409200000 was als applied gemarkeerd zonder echt te draaien.
-- Past idempotent opnieuw toe wat in die migratie hoort te staan.

ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS assigned_stock_location_id TEXT
    REFERENCES public.stock_locations(id);

COMMENT ON COLUMN public.donation_batches.assigned_stock_location_id
  IS 'Warehouse location where donated items will be stored/processed';

DROP POLICY IF EXISTS "organizations can update own record" ON public.organizations;
CREATE POLICY "organizations can update own record"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id = (
      SELECT organization_id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    id = (
      SELECT organization_id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE INDEX IF NOT EXISTS idx_donation_batches_service_partner
  ON public.donation_batches(assigned_service_partner_id)
  WHERE assigned_service_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donation_batches_stock_location
  ON public.donation_batches(assigned_stock_location_id)
  WHERE assigned_stock_location_id IS NOT NULL;
