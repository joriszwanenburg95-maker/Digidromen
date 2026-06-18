-- ════════════════════════════════════════════════════════════════════════
-- help_org mag de eigen organisatie alleen beperkt bewerken.
--
-- De policy "organizations can update own record" (20260409200000) laat een
-- gekoppelde gebruiker de hele org-rij bijwerken; de kolom-restrictie zat tot
-- nu alleen in de app. Deze guard dwingt het op DB-niveau af: een help_org mag
-- uitsluitend het leveradres (address/postal_code/city) en de
-- doelgroepomschrijving wijzigen. Naam, contactgegevens en alle overige velden
-- beheert Digidromen. (service_partner en staff/admin blijven ongemoeid.)
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_help_org_org_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff_or_admin() OR public.current_app_role() <> 'help_org' THEN
    RETURN NEW;
  END IF;

  IF NEW.name             IS DISTINCT FROM OLD.name
     OR NEW.contact_name  IS DISTINCT FROM OLD.contact_name
     OR NEW.contact_email IS DISTINCT FROM OLD.contact_email
     OR NEW.active        IS DISTINCT FROM OLD.active
     OR NEW.is_orderable  IS DISTINCT FROM OLD.is_orderable
     OR NEW.type          IS DISTINCT FROM OLD.type
     OR NEW.donor_since   IS DISTINCT FROM OLD.donor_since
     OR NEW.preferred_pickup_day IS DISTINCT FROM OLD.preferred_pickup_day
     OR NEW.reminder_opt_in      IS DISTINCT FROM OLD.reminder_opt_in
     OR NEW.crm_hubspot_id  IS DISTINCT FROM OLD.crm_hubspot_id
     OR NEW.crm_relation_id IS DISTINCT FROM OLD.crm_relation_id
  THEN
    RAISE EXCEPTION 'Als hulporganisatie kun je alleen het leveradres en de doelgroepomschrijving aanpassen. Neem contact op met Digidromen om andere gegevens te wijzigen.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_help_org_org_mutation ON public.organizations;
CREATE TRIGGER trg_prevent_help_org_org_mutation
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_help_org_org_mutation();
