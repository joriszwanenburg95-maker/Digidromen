-- Migration: Donation flow improvements + organization self-edit
-- 1. Add assigned_stock_location_id to donation_batches
-- 2. Allow organizations to edit their own profile
-- 3. Default service partner failsafe

-- ============================================================
-- 1. Add stock location tracking to donation batches
-- ============================================================
ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS assigned_stock_location_id TEXT
    REFERENCES public.stock_locations(id);

COMMENT ON COLUMN public.donation_batches.assigned_stock_location_id
  IS 'Warehouse location where donated items will be stored/processed';

-- ============================================================
-- 2. Organization self-edit: allow orgs to update their own record
-- ============================================================
-- help_org and service_partner can update their OWN organization
-- (limited to safe fields via the app layer; RLS just checks ownership)
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

-- ============================================================
-- 3. Index for faster donation queries by service partner
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_donation_batches_service_partner
  ON public.donation_batches(assigned_service_partner_id)
  WHERE assigned_service_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donation_batches_stock_location
  ON public.donation_batches(assigned_stock_location_id)
  WHERE assigned_stock_location_id IS NOT NULL;
