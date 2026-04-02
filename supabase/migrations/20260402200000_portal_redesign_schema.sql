-- ============================================================
-- Portal Redesign Schema — SP1
-- Enum herdefiniëring, schema-uitbreidingen, nieuwe tabellen
-- ============================================================

-- 1. order_status vervangen (data is gereset, USING 'concept' is veilig)
ALTER TABLE public.orders ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM (
  'concept',
  'ingediend',
  'te_accorderen',
  'geaccordeerd',
  'in_voorbereiding',
  'geleverd',
  'afgesloten',
  'afgewezen'
);
ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status
  USING 'concept'::public.order_status;

-- 2. donation_status vervangen
ALTER TABLE public.donation_batches ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS public.donation_status CASCADE;
CREATE TYPE public.donation_status AS ENUM (
  'concept',
  'aangemeld',
  'pickup_gepland',
  'ontvangen',
  'in_verwerking',
  'verwerkt',
  'geannuleerd'
);
ALTER TABLE public.donation_batches
  ALTER COLUMN status TYPE public.donation_status
  USING 'aangemeld'::public.donation_status;

-- 3. organization_type uitbreiden met 'donor'
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'donor';

-- 4. rma_category constraint uitbreiden met 'powerbank'
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur', 'powerbank')
  );

-- 5. approval_status (los van workflow status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM (
      'in_afwachting',
      'goedgekeurd',
      'afgewezen'
    );
  END IF;
END $$;

-- ============================================================
-- Orders uitbreidingen
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status
    NOT NULL DEFAULT 'in_afwachting',
  ADD COLUMN IF NOT EXISTS archive_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date_source TEXT
    CHECK (delivery_date_source IN ('manual', 'integration')),
  ADD COLUMN IF NOT EXISTS delivery_date_set_by TEXT
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_date_changed_at TIMESTAMPTZ;

-- Trigger: sync approval_status bij statusovergang naar geaccordeerd/afgewezen
CREATE OR REPLACE FUNCTION public.orders_sync_approval_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'geaccordeerd' THEN
    NEW.approval_status := 'goedgekeurd';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  ELSIF NEW.status = 'afgewezen' THEN
    NEW.approval_status := 'afgewezen';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_approval ON public.orders;
CREATE TRIGGER trg_orders_sync_approval
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_sync_approval_status();

-- Trigger: log delivery_date wijziging
CREATE OR REPLACE FUNCTION public.orders_track_delivery_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
    NEW.delivery_date_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_delivery_date ON public.orders;
CREATE TRIGGER trg_orders_delivery_date
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_track_delivery_date();

-- ============================================================
-- Order lines uitbreidingen
-- ============================================================
ALTER TABLE public.order_lines
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT,
  ADD COLUMN IF NOT EXISTS attachment_document_ids TEXT[] DEFAULT '{}';

-- Uitbreiden: powerbank validatie in bestaande trigger
CREATE OR REPLACE FUNCTION public.order_lines_validate_rma()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.line_type = 'rma_defect' THEN
    IF NEW.rma_category = 'laptop' THEN
      IF NEW.serial_number IS NULL OR NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Laptop defect vereist serial_number en defect_description';
      END IF;
    ELSIF NEW.rma_category = 'voedingskabel' THEN
      IF NEW.serial_number IS NULL THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist serial_number';
      END IF;
      IF NOT (
        (NEW.connector_type IS NOT NULL AND NEW.connector_wattage IS NOT NULL)
        OR array_length(NEW.defect_photo_urls, 1) >= 2
      ) THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist (connector_type + connector_wattage) of minimaal 2 defect_photo_urls';
      END IF;
    ELSIF NEW.rma_category = 'powerbank' THEN
      IF NEW.serial_number IS NULL OR NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Powerbank defect vereist serial_number en defect_description';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Products uitbreidingen
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_scenario TEXT NOT NULL DEFAULT 'new_request'
    CHECK (order_scenario IN ('new_request', 'replacement', 'accessory')),
  ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_replacement_product BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_managed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'stuk';

-- Seed: powerbank als product (als nog niet bestaat)
INSERT INTO public.products (id, sku, name, description, category, order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES (
  'prod-powerbank',
  'PB-001',
  'Powerbank',
  'Vervanging powerbank voor laptoppakket',
  'accessory',
  'replacement',
  true,
  true,
  true,
  'stuk'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Organizations uitbreidingen
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donor_since DATE,
  ADD COLUMN IF NOT EXISTS preferred_pickup_day TEXT
    CHECK (preferred_pickup_day IN ('maandag','dinsdag','woensdag','donderdag','vrijdag') OR preferred_pickup_day IS NULL);

-- ============================================================
-- Organization contacts (nieuwe tabel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_org_contacts_org
  ON public.organization_contacts(organization_id);

ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read org_contacts" ON public.organization_contacts;
CREATE POLICY "staff read org_contacts"
  ON public.organization_contacts FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff manage org_contacts" ON public.organization_contacts;
CREATE POLICY "staff manage org_contacts"
  ON public.organization_contacts FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "help_org read own contacts" ON public.organization_contacts;
CREATE POLICY "help_org read own contacts"
  ON public.organization_contacts FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'help_org'
    AND organization_id = public.current_organization_id()
  );

-- ============================================================
-- Inventory movements (nieuwe tabel)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM (
      'order_fulfillment',
      'donation_receipt',
      'adjustment',
      'return',
      'repair_consumption'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  stock_location_id TEXT REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity_delta INTEGER NOT NULL,
  movement_type public.movement_type NOT NULL,
  source_case_id TEXT,
  source_case_type TEXT CHECK (source_case_type IN ('order', 'donation')),
  note TEXT,
  created_by TEXT REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product
  ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_case
  ON public.inventory_movements(source_case_id, source_case_type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created
  ON public.inventory_movements(created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read movements" ON public.inventory_movements;
CREATE POLICY "staff read movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff manage movements" ON public.inventory_movements;
CREATE POLICY "staff manage movements"
  ON public.inventory_movements FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "service_partner read movements" ON public.inventory_movements;
CREATE POLICY "service_partner read movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.current_app_role() = 'service_partner');

-- ============================================================
-- Donation batches uitbreidingen
-- ============================================================
ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS processing_result JSONB,
  ADD COLUMN IF NOT EXISTS certificate_required_at TIMESTAMPTZ;

-- Trigger: zet certificate_required_at bij overgang naar in_verwerking
CREATE OR REPLACE FUNCTION public.donation_set_certificate_required()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'in_verwerking' AND OLD.status <> 'in_verwerking'
     AND NEW.certificate_required_at IS NULL THEN
    NEW.certificate_required_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_cert_required ON public.donation_batches;
CREATE TRIGGER trg_donation_cert_required
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_set_certificate_required();

-- Guard: donatie naar 'verwerkt' vereist certificaat
CREATE OR REPLACE FUNCTION public.donation_check_certificate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'verwerkt' AND OLD.status <> 'verwerkt' THEN
    IF NEW.data_wipe_certificate_url IS NULL THEN
      RAISE EXCEPTION 'Donatie kan niet naar verwerkt zonder data_wipe_certificate_url';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_check_cert ON public.donation_batches;
CREATE TRIGGER trg_donation_check_cert
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_check_certificate();

-- ============================================================
-- Bestelvenster — vereenvoudigde functie (dag X t/m dag Y van de maand)
-- ============================================================
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
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  IF cfg IS NULL THEN RETURN true; END IF;

  open_day  := (cfg->>'open_day')::int;
  close_day := (cfg->>'close_day')::int;
  today_day := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;

  RETURN today_day BETWEEN open_day AND close_day;
END;
$$;

-- Update portal_config: nieuw eenvoudiger formaat
INSERT INTO public.portal_config (key, value) VALUES (
  'ordering_windows',
  '{
    "open_day": 1,
    "close_day": 7,
    "timezone": "Europe/Amsterdam",
    "admin_bypass": true
  }'::jsonb
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- RPC wrapper zodat frontend zonder service_role key kan controleren
DROP FUNCTION IF EXISTS public.check_ordering_window();
CREATE OR REPLACE FUNCTION public.check_ordering_window()
RETURNS TABLE(is_open boolean, open_day int, close_day int, today_day int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  o int;
  c int;
  t int;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  o := (cfg->>'open_day')::int;
  c := (cfg->>'close_day')::int;
  t := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;
  RETURN QUERY SELECT (t BETWEEN o AND c), o, c, t;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ordering_window() TO authenticated;
