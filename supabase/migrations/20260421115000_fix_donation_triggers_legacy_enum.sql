-- security_hardening.sql verwees nog naar oude donation_status-waarden (OP_VOORRAAD, OPGEHAALD, …).
-- Na portal_redesign_schema zijn die waarden vervangen door o.a. pickup_gepland, ontvangen, verwerkt.
-- Zonder deze fix falen UPDATEs op donation_batches (o.a. bij servicepartner-backfill) met:
--   invalid input value for enum donation_status: "OP_VOORRAAD"

CREATE OR REPLACE FUNCTION public.donation_batches_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pickup_gepland'::public.donation_status
    AND (OLD.status IS DISTINCT FROM 'pickup_gepland'::public.donation_status)
    AND NEW.pickup_scheduled_at IS NULL THEN
    NEW.pickup_scheduled_at := now();
  END IF;

  IF NEW.status = 'ontvangen'::public.donation_status
    AND (OLD.status IS DISTINCT FROM 'ontvangen'::public.donation_status)
    AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;

  IF NEW.status = 'verwerkt'::public.donation_status
    AND (OLD.status IS DISTINCT FROM 'verwerkt'::public.donation_status)
    AND NEW.processed_at IS NULL THEN
    NEW.processed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Zelfde regel als public.donation_check_certificate() (trigger trg_donation_check_cert)
CREATE OR REPLACE FUNCTION public.donation_batches_check_certificate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verwerkt'::public.donation_status
    AND (OLD.status IS DISTINCT FROM 'verwerkt'::public.donation_status)
    AND NEW.data_wipe_certificate_url IS NULL THEN
    RAISE EXCEPTION 'Donatie kan niet naar verwerkt zonder data_wipe_certificate_url';
  END IF;

  RETURN NEW;
END;
$$;
