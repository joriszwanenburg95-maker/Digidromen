-- Consolidatie: forceert de laatste RMA-validatietrigger en chk_rma_category constraint.
-- Idempotent. Veilig om uit te voeren ongeacht eerdere staat.
-- Reden: migration history op productie was uit sync; deze migratie zorgt dat de runtime
-- staat overeenkomt met wat de portal-code verwacht (rugzak/headset/powerbank/muis optioneel).

-- 1. chk_rma_category: zorg dat alle huidige categorieën zijn toegestaan
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur', 'powerbank', 'muis', 'rugzak', 'headset')
  );

-- 2. RMA-validatietrigger: laatste body (gelijk aan 20260422120000)
CREATE OR REPLACE FUNCTION public.order_lines_validate_rma()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.line_type = 'rma_defect' THEN
    IF NEW.rma_category = 'laptop' THEN
      IF NEW.serial_number IS NULL OR btrim(NEW.serial_number) = ''
         OR NEW.defect_description IS NULL OR btrim(NEW.defect_description) = ''
      THEN
        RAISE EXCEPTION 'Laptop defect vereist serial_number en defect_description';
      END IF;
    ELSIF NEW.rma_category = 'voedingskabel' THEN
      IF NEW.serial_number IS NULL OR btrim(NEW.serial_number) = '' THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist serial_number';
      END IF;
      IF NOT (
        (
          NEW.connector_type IS NOT NULL
          AND btrim(NEW.connector_type) <> ''
          AND NEW.connector_wattage IS NOT NULL
          AND btrim(NEW.connector_wattage) <> ''
        )
        OR COALESCE(array_length(NEW.defect_photo_urls, 1), 0) >= 2
      ) THEN
        RAISE EXCEPTION 'Voedingskabel defect vereist (connector_type + connector_wattage) of minimaal 2 defect_photo_urls';
      END IF;
    END IF;
    -- muis, rugzak, headset, powerbank: geen extra trigger-validatie
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.order_lines_validate_rma() IS
  'RMA-validatie: strikt laptop + voedingskabel; overige categorieën niet afgedwongen (app/UI kan vragen).';
