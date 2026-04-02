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
