-- Security Advisor: Function Search Path Mutable
-- Zet vaste search_path op triggerfuncties (hardening tegen search_path-aanvallen).

CREATE OR REPLACE FUNCTION public.orders_set_approved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'geaccordeerd' AND (OLD.status IS DISTINCT FROM 'geaccordeerd') AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_sync_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'geaccordeerd' THEN
    NEW.approval_status := 'goedgekeurd';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  ELSIF NEW.status = 'afgewezen' THEN
    NEW.approval_status := 'afgewezen';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_track_delivery_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_date IS DISTINCT FROM OLD.delivery_date THEN
    NEW.delivery_date_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.order_lines_validate_rma()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.donation_set_certificate_required()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_verwerking' AND OLD.status <> 'in_verwerking'
     AND NEW.certificate_required_at IS NULL THEN
    NEW.certificate_required_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.donation_check_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verwerkt' AND OLD.status <> 'verwerkt' THEN
    IF NEW.data_wipe_certificate_url IS NULL THEN
      RAISE EXCEPTION 'Donatie kan niet naar verwerkt zonder data_wipe_certificate_url';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Performance Advisor: Auth RLS Initialization Plan op public.orders (insert policy).
-- auth.uid() per rij → één initplan met (select auth.uid()).
DROP POLICY IF EXISTS "help org create own orders or staff manage" ON public.orders;
CREATE POLICY "help org create own orders or staff manage" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_or_admin()
    OR (
      public.current_app_role() = 'help_org'
      AND organization_id = public.current_organization_id()
      AND requester_user_id IN (
        SELECT up.id
        FROM public.user_profiles up
        WHERE up.auth_user_id = (SELECT auth.uid())
      )
    )
  );
