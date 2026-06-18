-- ════════════════════════════════════════════════════════════════════════
-- Order_lines integriteit (audit-bevindingen #2 en #6).
--
-- #2  Backend-vangnet voor aantal:
--     - quantity moet >= 1 (frontend dwong dit al af, backend niet).
--     - laptop-RMA is altijd precies 1 stuk (uniek serienummer / 1-op-1).
-- #6  'randapparatuur' is een dode rma_category (geen product, geen UI, geen
--     trigger-tak) en wordt uit de toegestane waarden gehaald.
--
-- Beide CHECK-constraints worden met NOT VALID toegevoegd: ze gelden voor alle
-- NIEUWE en GEWIJZIGDE regels, maar valideren bestaande rijen niet retroactief
-- (de RMA-trigger draait BEFORE INSERT OR UPDATE; we breken geen oude data).
-- ════════════════════════════════════════════════════════════════════════

-- ── #2a: quantity >= 1 ───────────────────────────────────────────────────
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_order_lines_quantity_positive;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_order_lines_quantity_positive CHECK (quantity >= 1) NOT VALID;

-- ── #2b: laptop-RMA altijd 1 stuk (in de bestaande RMA-validatietrigger) ──
-- Identiek aan 20260609120000, met één extra regel voor de laptop-tak.
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
      IF NEW.quantity <> 1 THEN
        RAISE EXCEPTION 'Een laptopvervanging betreft altijd precies 1 laptop (uniek serienummer).';
      END IF;
    ELSIF NEW.rma_category = 'voedingskabel' THEN
      -- Serienummer is optioneel; het aantal geldt per connectortype/wattage.
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
  'RMA-validatie: laptop strikt (serial + klacht + quantity 1); voedingskabel vereist connector_type + connector_wattage (serial optioneel); overige categorieën niet afgedwongen.';

-- ── #6: 'randapparatuur' uit chk_rma_category ────────────────────────────
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'powerbank', 'muis', 'rugzak', 'headset')
  ) NOT VALID;
