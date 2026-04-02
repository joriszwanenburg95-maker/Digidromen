# Database Migraties

Alle migraties zijn additief — geen destructieve changes. Bestaande data en kolommen blijven intact.

## Baseline
Huidig schema: 4 migraties in `supabase/migrations/`
- `20260312123000_portal_initial.sql` — Core schema (14 tabellen, enums, RLS, triggers)
- `20260312143000_auth_profile_sync.sql` — Auth → user_profiles sync trigger
- `20260312150000_create_portal_users.sql` — Demo users seed
- `20260312170000_simplify_laptop_inventory.sql` — Laptop inventory consolidatie

## Nieuwe Migraties

### Migratie 1: `20260401000000_stock_locations.sql`

```sql
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
```

### Migratie 2: `20260401000100_products_packages.sql`

```sql
-- Products uitbreiden
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS age_group TEXT[],
  ADD COLUMN IF NOT EXISTS is_package BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_components JSONB;

-- Hardware Pakketten
INSERT INTO public.products (id, sku, name, category, description, age_group, is_package, package_components, active, specification_summary)
VALUES
  ('pkg-6-12', 'PKG-LAPTOP-6-12', 'Laptoppakket 6-12 jaar', 'laptop',
   'Compleet pakket voor kinderen 6-12 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-12'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding']),

  ('pkg-12-18', 'PKG-LAPTOP-12-18', 'Laptoppakket 12-18 jaar', 'laptop',
   'Compleet pakket voor jongeren 12-18 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['12-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding']),

  ('pkg-universal', 'PKG-LAPTOP-UNI', 'Laptoppakket Universeel (6-18)', 'laptop',
   'Compleet pakket voor alle leeftijden: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding'])
ON CONFLICT (id) DO NOTHING;

-- Losse accessoires/componenten
INSERT INTO public.products (id, sku, name, category, description, active, specification_summary)
VALUES
  ('prod-muis', 'ACC-MUIS', 'Muis', 'accessory', 'Computermuis', true, ARRAY['USB muis']),
  ('prod-headset', 'ACC-HEADSET', 'Headset', 'accessory', 'Headset met microfoon', true, ARRAY['Over-ear headset']),
  ('prod-rugzak', 'ACC-RUGZAK', 'Rugzak', 'accessory', 'Laptoptas/rugzak', true, ARRAY['Rugzak']),
  ('prod-handleiding', 'ACC-HANDLEIDING', 'Handleiding', 'accessory', 'Gebruikershandleiding', true, ARRAY['Gedrukte handleiding']),
  ('prod-stickers', 'ACC-STICKERS', 'Stickers', 'accessory', 'Digidromen stickers', true, ARRAY['Stickervel']),
  ('prod-voedingskabel', 'ACC-VOEDING', 'Voedingskabel', 'accessory', 'Laptop voedingsadapter', true, ARRAY['Voedingsadapter'])
ON CONFLICT (id) DO NOTHING;
```

### Migratie 3: `20260401000200_orders_extensions.sql`

```sql
-- Orders uitbreiden
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS target_month DATE,
  ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS ordering_window_ref TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_user_id TEXT REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE;

-- Order lines uitbreiden
ALTER TABLE public.order_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'new_request',
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS defect_description TEXT,
  ADD COLUMN IF NOT EXISTS defect_photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS connector_type TEXT,
  ADD COLUMN IF NOT EXISTS connector_wattage TEXT,
  ADD COLUMN IF NOT EXISTS rma_category TEXT;

-- Constraints
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_line_type CHECK (line_type IN ('new_request', 'rma_defect'));

ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur')
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_target_month ON public.orders(target_month);
```

### Migratie 4: `20260401000300_donations_extensions.sql`

```sql
ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shipment_reference TEXT,
  ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS data_wipe_certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS residual_value_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_notified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thank_you_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_laptops INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_mice INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_headsets INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_bags INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_chargers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_other INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Document kind uitbreiden
DO $$ BEGIN
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'data_wipe_certificate';
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'connector_photo';
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'invoice';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### Migratie 5: `20260401000400_repair_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS public.repair_logs (
  id TEXT PRIMARY KEY,
  repair_case_id TEXT NOT NULL REFERENCES public.repair_cases(id) ON DELETE CASCADE,
  repair_successful BOOLEAN NOT NULL,
  cost_per_unit_eur NUMERIC,
  reason_unrepairable TEXT,
  parts_used JSONB,
  invoiced BOOLEAN NOT NULL DEFAULT false,
  technician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_repair_logs_case
  ON public.repair_logs(repair_case_id);

ALTER TABLE public.repair_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read repair_logs"
  ON public.repair_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff or partner manage repair_logs"
  ON public.repair_logs FOR ALL TO authenticated
  USING (
    public.is_staff_or_admin()
    OR (
      public.current_app_role() = 'service_partner'
      AND EXISTS (
        SELECT 1 FROM public.repair_cases rc
        WHERE rc.id = repair_case_id
          AND rc.assigned_service_partner_id = public.current_organization_id()
      )
    )
  )
  WITH CHECK (
    public.is_staff_or_admin()
    OR (
      public.current_app_role() = 'service_partner'
      AND EXISTS (
        SELECT 1 FROM public.repair_cases rc
        WHERE rc.id = repair_case_id
          AND rc.assigned_service_partner_id = public.current_organization_id()
      )
    )
  );
```

### Migratie 6: `20260401000500_audit_log.sql`

```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

-- Audit trigger functie
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id TEXT;
  _user_email TEXT;
BEGIN
  SELECT up.id, up.email INTO _user_id, _user_email
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, new_value)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', _user_id, _user_email, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, old_value, new_value)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', _user_id, _user_email, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, old_value)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', _user_id, _user_email, to_jsonb(OLD));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers op key tabellen
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_repair_cases AFTER INSERT OR UPDATE OR DELETE ON public.repair_cases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_donation_batches AFTER INSERT OR UPDATE OR DELETE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_inventory_items AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
```

### Migratie 7: `20260401000600_portal_config.sql`

```sql
CREATE TABLE IF NOT EXISTS public.portal_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.portal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read portal_config"
  ON public.portal_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage portal_config"
  ON public.portal_config FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed: bestelvensters
INSERT INTO public.portal_config (key, value) VALUES
  ('ordering_windows', '{
    "policy": "month_boundary_window",
    "open_day_of_month": 22,
    "close_day_of_next_month": 7,
    "order_for_next_month_only": true,
    "timezone": "Europe/Amsterdam"
  }'::jsonb),
  ('low_stock_thresholds', '{
    "laptop": 10,
    "accessory": 20,
    "default": 5
  }'::jsonb),
  ('crm_field_ownership', '{
    "portal_owns": ["status", "workflow_events", "delivery_address", "actual_delivery_date", "inventory"],
    "crm_owns": ["partner_status", "contact_details", "company_info", "deals"]
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

Aanvullende implementatieregels voor v1:
- voeg een SQL functie `is_ordering_window_open(target_month date)` toe die het maandgrens-venster valideert
- voeg een `CHECK` of trigger toe voor defectregels:
  - laptop defect vereist `serial_number` en `defect_description`
  - voedingskabel defect vereist `serial_number` en ofwel (`connector_type` + `connector_wattage`) ofwel minimaal 2 `defect_photo_urls`
- voeg een trigger toe die bij status `BEOORDEELD` automatisch `approved_at` vult als deze leeg is
- voeg een trigger toe die bij donatiestatussen `OPHAALAFSPRAAK_GEPLAND`, `OPGEHAALD` en `RAPPORTAGE_GEREED` respectievelijk `pickup_scheduled_at`, `picked_up_at` en `processed_at` vult
- voeg een trigger of policy toe die `OP_VOORRAAD` blokkeert als verplichte rapportage-documenten ontbreken

### Migratie 8: `20260401000700_forecast_snapshots.sql`

```sql
CREATE TABLE IF NOT EXISTS public.forecast_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  horizon_months INTEGER NOT NULL DEFAULT 3,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.forecast_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read forecasts"
  ON public.forecast_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff manage forecasts"
  ON public.forecast_snapshots FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());
```

### Migratie 9: `20260401000800_crm_sync_extensions.sql`

```sql
ALTER TABLE public.crm_sync_jobs
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS hubspot_object_type TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_object_id TEXT,
  ADD COLUMN IF NOT EXISTS field_changes JSONB;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS crm_hubspot_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;
```

## Migratievolgorde
1. stock_locations (geen dependencies)
2. products_packages (geen dependencies op nieuwe tabellen)
3. orders_extensions (geen dependencies)
4. donations_extensions (geen dependencies)
5. repair_logs (depends on repair_cases — bestaand)
6. audit_log (depends on alle tabellen — bestaand)
7. portal_config (geen dependencies)
8. forecast_snapshots (geen dependencies)
9. crm_sync_extensions (geen dependencies)

Alle migraties zijn onafhankelijk en kunnen in willekeurige volgorde worden uitgevoerd, behalve dat audit_log triggers refereren naar bestaande tabellen.
