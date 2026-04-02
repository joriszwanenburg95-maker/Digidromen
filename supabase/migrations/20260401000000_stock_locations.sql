-- Stock Locations tabel
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_stock_locations_updated_at
  BEFORE UPDATE ON public.stock_locations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Inventory items uitbreiden
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS stock_location_id TEXT REFERENCES public.stock_locations(id);

-- Index
CREATE INDEX IF NOT EXISTS idx_stock_locations_org
  ON public.stock_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock_location
  ON public.inventory_items(stock_location_id);

-- RLS
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read stock_locations"
  ON public.stock_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff manage stock_locations"
  ON public.stock_locations FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "service_partner read own locations"
  ON public.stock_locations FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'service_partner'
    AND organization_id = public.current_organization_id()
  );

-- Seed: initiële locaties
INSERT INTO public.stock_locations (id, name, organization_id, city, is_active)
VALUES
  ('loc-digidromen', 'Digidromen Centraal', 'org-digidromen', 'Amsterdam', true),
  ('loc-aces', 'Aces Direct Warehouse', 'org-aces-direct', 'Utrecht', true)
ON CONFLICT (id) DO NOTHING;
