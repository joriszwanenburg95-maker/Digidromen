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

-- Seed: bestelvensters en thresholds
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
