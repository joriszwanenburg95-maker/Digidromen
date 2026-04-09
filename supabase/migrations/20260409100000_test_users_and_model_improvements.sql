-- 1. Doelgroepomschrijving verhuizen naar organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS target_group_description text;

COMMENT ON COLUMN public.organizations.target_group_description
  IS 'Standaard doelgroepomschrijving van de organisatie, wordt als default in orders overgenomen';

-- 2. rma_category constraint uitbreiden met 'muis' en 'rugzak'
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur', 'powerbank', 'muis', 'rugzak')
  );

-- RMA trigger bijwerken: muis en rugzak validatie toevoegen
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
    ELSIF NEW.rma_category IN ('muis', 'rugzak') THEN
      IF NEW.defect_description IS NULL THEN
        RAISE EXCEPTION 'Muis/rugzak vervanging vereist defect_description (reden)';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Muis en rugzak als bestelbaar/vervangbaar markeren
UPDATE public.products
SET is_orderable = true,
    is_replacement_product = true,
    order_scenario = 'replacement'
WHERE id IN ('prod-muis', 'prod-rugzak');

-- 3. Test organisaties aanmaken (idempotent)
INSERT INTO public.organizations (id, name, type, city, contact_name, contact_email, address, postal_code, active, is_orderable, target_group_description)
VALUES
  ('org-aces-direct', 'Aces Direct', 'service_partner', 'Eindhoven',
   'Test Servicepartner', 'testuserserviceorganisatie@digidromen.test',
   'Serviceweg 10', '5600 AA', true, false, NULL),
  ('org-gemeente-test', 'Gemeente Test', 'help_org', 'Amsterdam',
   'Test Hulporganisatie', 'testuserhulporganisatie@digidromen.test',
   'Gemeenteplein 1', '1000 AA', true, true,
   'Kinderen uit minimagezinnen in Amsterdam, leeftijd 6-16 jaar, die via het Jeugdfonds deelnemen aan onderwijs- en digitale inclusie-programma''s.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  city = EXCLUDED.city,
  contact_name = EXCLUDED.contact_name,
  contact_email = EXCLUDED.contact_email,
  address = EXCLUDED.address,
  postal_code = EXCLUDED.postal_code,
  active = EXCLUDED.active,
  is_orderable = EXCLUDED.is_orderable,
  target_group_description = EXCLUDED.target_group_description;

-- 4. Test users aanmaken via Supabase auth
-- NB: De auth users moeten handmatig of via de Supabase dashboard/CLI aangemaakt worden,
-- omdat auth.users niet direct via SQL INSERT in hosted Supabase beschikbaar is.
-- Hieronder alvast de user_profiles die na auth-creatie gekoppeld worden.

-- Placeholder profile IDs voor de test users
-- De auth_user_id wordt na aanmaak in Supabase Auth ingevuld.
INSERT INTO public.user_profiles (id, auth_user_id, organization_id, role, name, email, title)
VALUES
  ('usr-test-service', '00000000-0000-0000-0000-000000000001', 'org-aces-direct',
   'service_partner', 'Test Servicepartner', 'testuserserviceorganisatie@digidromen.test', 'Testaccount'),
  ('usr-test-helporg', '00000000-0000-0000-0000-000000000002', 'org-gemeente-test',
   'help_org', 'Test Hulporganisatie', 'testuserhulporganisatie@digidromen.test', 'Testaccount')
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  title = EXCLUDED.title;
