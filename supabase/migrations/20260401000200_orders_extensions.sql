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

-- Bestelvenster validatie functie
CREATE OR REPLACE FUNCTION public.is_ordering_window_open(target_month date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cfg jsonb;
  open_day int;
  close_day int;
  now_ams timestamptz;
  window_open date;
  window_close date;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  IF cfg IS NULL THEN RETURN true; END IF;

  open_day  := (cfg->>'open_day_of_month')::int;
  close_day := (cfg->>'close_day_of_next_month')::int;
  now_ams   := now() AT TIME ZONE 'Europe/Amsterdam';

  -- Venster opent op open_day van de maand vóór target_month
  window_open  := date_trunc('month', target_month) - interval '1 month'
                  + (open_day - 1) * interval '1 day';
  -- Venster sluit op close_day van target_month
  window_close := date_trunc('month', target_month)
                  + (close_day - 1) * interval '1 day';

  RETURN now_ams::date BETWEEN window_open AND window_close;
END;
$$;

-- Trigger: vul approved_at automatisch bij status BEOORDEELD
CREATE OR REPLACE FUNCTION public.orders_set_approved_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'BEOORDEELD' AND OLD.status <> 'BEOORDEELD' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_approved_at ON public.orders;
CREATE TRIGGER trg_orders_approved_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_approved_at();

-- Validatie trigger voor defect-regels
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
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_lines_validate_rma ON public.order_lines;
CREATE TRIGGER trg_order_lines_validate_rma
  BEFORE INSERT OR UPDATE ON public.order_lines
  FOR EACH ROW EXECUTE FUNCTION public.order_lines_validate_rma();
