-- Headset als losse RMA/vervangingsbestelling (zelfde patroon als muis/rugzak)

ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN (
      'laptop',
      'voedingskabel',
      'randapparatuur',
      'powerbank',
      'muis',
      'rugzak',
      'headset'
    )
  );

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
    ELSIF NEW.rma_category IN ('muis', 'rugzak', 'headset') THEN
      IF NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Accessoire-vervanging vereist defect_description (reden)';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.products
SET is_orderable = true,
    is_replacement_product = true,
    order_scenario = 'replacement'
WHERE id = 'prod-headset';
