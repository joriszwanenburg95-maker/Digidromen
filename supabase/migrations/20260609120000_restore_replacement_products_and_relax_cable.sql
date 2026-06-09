-- Herstelt ontbrekende vervangproducten en versoepelt de voedingskabel-validatie.
--
-- Achtergrond:
-- 1. prod-rugzak en prod-headset waren na een data-reset (cleanup_demo_data.sql)
--    verdwenen. De seed-migratie gebruikt ON CONFLICT DO NOTHING en de flag-fix
--    migratie gebruikt UPDATE ... WHERE id IN (...), dus geen van beide kon de
--    rijen opnieuw aanmaken. Gevolg: "Vervanging rugzak" en "Vervanging headset"
--    faalden met "Er is geen passend product ingericht voor dit type bestelling".
-- 2. Voedingskabels worden voortaan per connectortype/wattage besteld met een
--    aantal. Een serienummer hoort niet 1-op-1 bij één kabel, dus dat is niet
--    langer verplicht.
--
-- Idempotent en veilig om herhaald uit te voeren.

-- 1. Zorg dat ALLE vervangproducten bestaan én de juiste flags hebben.
INSERT INTO public.products
  (id, sku, name, category, description, active, specification_summary,
   order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES
  ('prod-laptop', 'HW-LAPTOP', 'Laptop', 'laptop',
   'Refurbished laptop voor vervanging', true, ARRAY['Refurbished laptop'],
   'replacement', true, true, true, 'stuk'),
  ('prod-voedingskabel', 'ACC-VOEDING', 'Voedingskabel', 'accessory',
   'Laptop voedingsadapter', true, ARRAY['Voedingsadapter'],
   'replacement', true, true, true, 'stuk'),
  ('prod-powerbank', 'PB-001', 'Powerbank', 'accessory',
   'Vervanging powerbank voor laptoppakket', true, ARRAY['Powerbank'],
   'replacement', true, true, true, 'stuk'),
  ('prod-muis', 'ACC-MUIS', 'Muis', 'accessory',
   'Computermuis', true, ARRAY['USB muis'],
   'replacement', true, true, true, 'stuk'),
  ('prod-headset', 'ACC-HEADSET', 'Headset', 'accessory',
   'Headset met microfoon', true, ARRAY['Over-ear headset'],
   'replacement', true, true, true, 'stuk'),
  ('prod-rugzak', 'ACC-RUGZAK', 'Rugzak', 'accessory',
   'Laptoptas/rugzak', true, ARRAY['Rugzak'],
   'replacement', true, true, true, 'stuk')
ON CONFLICT (id) DO UPDATE SET
  active = true,
  is_orderable = true,
  is_replacement_product = true,
  order_scenario = 'replacement';

-- 2. Versoepel de RMA-validatietrigger voor voedingskabel: serienummer niet meer
--    verplicht. Laptop blijft strikt (serial + defect_description).
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
  'RMA-validatie: laptop strikt (serial + klacht); voedingskabel vereist connector_type + connector_wattage (serial optioneel); overige categorieën niet afgedwongen.';
