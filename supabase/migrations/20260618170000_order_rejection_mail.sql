-- ════════════════════════════════════════════════════════════════════════
-- Afwijzingsmail (order_rejected) + optionele afwijzingsreden.
--   1. orders.rejection_reason (nullable) — door staff/admin in te vullen.
--   2. enqueue_order_email: status 'afgewezen' → mailtype 'order_rejected',
--      met de reden in de payload.
--   3. help_org order-guard: rejection_reason is staf-only.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ── 2. enqueue-trigger uitbreiden met de afwijzing ───────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_order_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_email   text;
  v_type    text := null;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'ingediend' THEN
      v_type := 'order_confirmation';
    END IF;
  ELSE -- UPDATE
    IF NEW.status = 'ingediend' AND OLD.status IS DISTINCT FROM 'ingediend' THEN
      v_type := 'order_confirmation';
    ELSIF NEW.status = 'geaccordeerd' AND OLD.status IS DISTINCT FROM 'geaccordeerd' THEN
      v_type := 'order_approved';
    ELSIF NEW.status = 'afgewezen' AND OLD.status IS DISTINCT FROM 'afgewezen' THEN
      v_type := 'order_rejected';
    ELSIF NEW.status = 'geleverd' AND OLD.status IS DISTINCT FROM 'geleverd' THEN
      v_type := 'order_update';
    ELSIF NEW.delivery_date IS NOT NULL
          AND NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
      v_type := 'order_update';
    END IF;
  END IF;

  IF v_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ontvanger = de besteller (inlog-e-mail), val terug op org-contactmail.
  SELECT up.id, up.email
    INTO v_user_id, v_email
  FROM public.user_profiles up
  WHERE up.id = NEW.requester_user_id;

  IF v_email IS NULL OR btrim(v_email) = '' THEN
    SELECT o.contact_email
      INTO v_email
    FROM public.organizations o
    WHERE o.id = NEW.organization_id;
  END IF;

  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.email_outbox (
    email_type, recipient_user_id, recipient_email,
    organization_id, order_id, payload
  )
  VALUES (
    v_type, v_user_id, v_email,
    NEW.organization_id, NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'status', NEW.status,
      'delivery_date', NEW.delivery_date,
      'rejection_reason', NEW.rejection_reason
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enqueue_order_email() IS
  'Plaatst order-mails in email_outbox: bevestiging (ingediend), goedkeuring (geaccordeerd), afwijzing (afgewezen) en update (geleverd of nieuwe verzend-/bezorgdatum).';

-- De trigger moet ook op rejection_reason letten zodat een afwijzing-met-reden
-- in één update correct wordt opgepakt (status verandert toch al naar afgewezen).
DROP TRIGGER IF EXISTS trg_enqueue_order_email ON public.orders;
CREATE TRIGGER trg_enqueue_order_email
  AFTER INSERT OR UPDATE OF status, delivery_date, rejection_reason ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_order_email();

-- ── 3. help_org guard: rejection_reason is staf-only ─────────────────────
CREATE OR REPLACE FUNCTION public.prevent_help_org_order_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff_or_admin() OR public.current_app_role() <> 'help_org' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('concept', 'ingediend') THEN
    RAISE EXCEPTION 'Je kunt je bestelling alleen indienen of als concept bewaren; het accorderen doet Digidromen.';
  END IF;

  IF NEW.approval_status         IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_at          IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by_user_id  IS DISTINCT FROM OLD.approved_by_user_id
     OR NEW.rejection_reason     IS DISTINCT FROM OLD.rejection_reason
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
