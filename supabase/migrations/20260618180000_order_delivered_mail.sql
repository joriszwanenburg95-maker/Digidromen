-- ════════════════════════════════════════════════════════════════════════
-- Aparte, warmere leveringsmail.
-- 'geleverd' kreeg tot nu het generieke type 'order_update'. We geven het een
-- eigen type 'order_delivered' met een feestelijkere tekst. Een losse
-- leverdatum-wijziging (zonder status geleverd) blijft 'order_update'.
-- ════════════════════════════════════════════════════════════════════════

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
      v_type := 'order_delivered';
    ELSIF NEW.delivery_date IS NOT NULL
          AND NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
      v_type := 'order_update';
    END IF;
  END IF;

  IF v_type IS NULL THEN
    RETURN NEW;
  END IF;

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
  'Order-mails: bevestiging (ingediend), goedkeuring (geaccordeerd), afwijzing (afgewezen), levering (geleverd) en update (nieuwe verzend-/bezorgdatum).';
