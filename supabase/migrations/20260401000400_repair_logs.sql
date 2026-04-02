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
