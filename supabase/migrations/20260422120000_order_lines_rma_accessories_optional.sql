-- Accessoire-RMA (muis, rugzak, headset, powerbank): geen verplichte velden op database-niveau,
-- zodat de portal-flow kan worden getest en optionele medewerkersvelden in de UI leeg mogen blijven.
-- Streng blijft: laptop + voedingskabel (veiligheid/traceability).

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
