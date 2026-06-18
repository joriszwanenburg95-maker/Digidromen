-- ════════════════════════════════════════════════════════════════════════
-- Versoepelt de help_org order-guard uit 20260618120000.
--
-- De vorige versie blokkeerde ELKE statuswijziging, waardoor een
-- hulporganisatie de eigen bestelling niet meer kon INDIENEN
-- (concept → ingediend). Ook legitieme draft-velden (motivation,
-- delivery_address, preferred_delivery_date, requested_at) werden geraakt.
--
-- Nieuwe regel voor help_org:
--   • status mag alleen 'concept' of 'ingediend' worden (indienen/intrekken);
--     accorderen/leveren/afwijzen blijft aan Digidromen.
--   • de accorderings-, (bevestigde) leverdatum- en CRM-velden mogen niet
--     door help_org gewijzigd worden.
--   • motivation, delivery_address, preferred_delivery_date, requested_at,
--     prioriteit e.d. blijven toegestaan (eigen aanvraaggegevens).
-- assigned_service_partner_id wordt bewust NIET geblokkeerd: die wordt door de
-- BEFORE-trigger set_default_service_partner gezet en geeft help_org niets.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_help_org_order_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff/admin en service_partner vallen buiten deze guard.
  IF public.is_staff_or_admin() OR public.current_app_role() <> 'help_org' THEN
    RETURN NEW;
  END IF;

  -- help_org mag de status alleen op 'concept' of 'ingediend' zetten.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('concept', 'ingediend') THEN
    RAISE EXCEPTION 'Je kunt je bestelling alleen indienen of als concept bewaren; het accorderen doet Digidromen.';
  END IF;

  -- Staf-velden (accordering, bevestigde leverdatum, CRM, archief, eigenaarschap)
  -- mogen niet door de hulporganisatie gewijzigd worden.
  IF NEW.approval_status         IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at          IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by_user_id  IS DISTINCT FROM OLD.approved_by_user_id
     OR NEW.delivery_date           IS DISTINCT FROM OLD.delivery_date
     OR NEW.delivery_date_changed_at IS DISTINCT FROM OLD.delivery_date_changed_at
     OR NEW.delivery_date_set_by    IS DISTINCT FROM OLD.delivery_date_set_by
     OR NEW.delivery_date_source    IS DISTINCT FROM OLD.delivery_date_source
     OR NEW.scheduled_delivery_date IS DISTINCT FROM OLD.scheduled_delivery_date
     OR NEW.actual_delivery_date    IS DISTINCT FROM OLD.actual_delivery_date
     OR NEW.archive_status       IS DISTINCT FROM OLD.archive_status
     OR NEW.organization_id      IS DISTINCT FROM OLD.organization_id
     OR NEW.crm_case_id          IS DISTINCT FROM OLD.crm_case_id
     OR NEW.crm_relation_id      IS DISTINCT FROM OLD.crm_relation_id
     OR NEW.crm_task_id          IS DISTINCT FROM OLD.crm_task_id
  THEN
    RAISE EXCEPTION 'Deze gegevens van je bestelling kunnen alleen door Digidromen worden gewijzigd.';
  END IF;

  RETURN NEW;
END;
$$;
