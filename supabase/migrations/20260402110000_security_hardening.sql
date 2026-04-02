CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT up.role
  FROM public.user_profiles AS up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT up.organization_id
  FROM public.user_profiles AS up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.current_app_role() IN ('digidromen_staff', 'digidromen_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.current_app_role() = 'digidromen_admin'
$$;

CREATE OR REPLACE FUNCTION public.is_ordering_window_open(target_month date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  open_day int;
  close_day int;
  now_ams timestamptz;
  window_open date;
  window_close date;
BEGIN
  SELECT value INTO cfg
  FROM public.portal_config
  WHERE key = 'ordering_windows';

  IF cfg IS NULL THEN
    RETURN true;
  END IF;

  open_day := (cfg->>'open_day_of_month')::int;
  close_day := (cfg->>'close_day_of_next_month')::int;
  now_ams := now() AT TIME ZONE 'Europe/Amsterdam';

  window_open := date_trunc('month', target_month) - interval '1 month'
    + (open_day - 1) * interval '1 day';
  window_close := date_trunc('month', target_month)
    + (close_day - 1) * interval '1 day';

  RETURN now_ams::date BETWEEN window_open AND window_close;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_set_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'BEOORDEELD'
    AND OLD.status <> 'BEOORDEELD'
    AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.order_lines_validate_rma()
RETURNS trigger
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
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.donation_batches_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'OPHAALAFSPRAAK_GEPLAND'
    AND (OLD.status IS DISTINCT FROM 'OPHAALAFSPRAAK_GEPLAND')
    AND NEW.pickup_scheduled_at IS NULL THEN
    NEW.pickup_scheduled_at := now();
  END IF;

  IF NEW.status = 'OPGEHAALD'
    AND (OLD.status IS DISTINCT FROM 'OPGEHAALD')
    AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;

  IF NEW.status = 'RAPPORTAGE_GEREED'
    AND (OLD.status IS DISTINCT FROM 'RAPPORTAGE_GEREED')
    AND NEW.processed_at IS NULL THEN
    NEW.processed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.donation_batches_check_certificate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'OP_VOORRAAD'
    AND (OLD.status IS DISTINCT FROM 'OP_VOORRAAD')
    AND NEW.data_wipe_certificate_url IS NULL THEN
    RAISE EXCEPTION 'data_wipe_certificate_url is verplicht voordat de batch als OP_VOORRAAD kan worden gemarkeerd';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id text;
  _user_email text;
BEGIN
  SELECT up.id, up.email
  INTO _user_id, _user_email
  FROM public.user_profiles AS up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, new_value)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', _user_id, _user_email, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, old_value, new_value)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', _user_id, _user_email, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, user_id, user_email, old_value)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', _user_id, _user_email, to_jsonb(OLD));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT up.id
  FROM public.user_profiles AS up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.case_write_allowed(_case_type public.case_type, _case_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_staff_or_admin()
    OR EXISTS (
      SELECT 1
      FROM public.orders AS o
      WHERE _case_type = 'order'
        AND o.id = _case_id
        AND (
          o.organization_id = public.current_organization_id()
          OR o.assigned_service_partner_id = public.current_organization_id()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.repair_cases AS rc
      WHERE _case_type = 'repair'
        AND rc.id = _case_id
        AND (
          rc.organization_id = public.current_organization_id()
          OR rc.assigned_service_partner_id = public.current_organization_id()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.donation_batches AS db
      WHERE _case_type = 'donation'
        AND db.id = _case_id
        AND (
          db.sponsor_organization_id = public.current_organization_id()
          OR db.assigned_service_partner_id = public.current_organization_id()
        )
    )
$$;

DROP POLICY IF EXISTS "authenticated insert messages" ON public.messages;
CREATE POLICY "authenticated insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = public.current_user_profile_id()
  AND public.case_write_allowed(case_type, case_id)
);

DROP POLICY IF EXISTS "authenticated insert documents" ON public.documents;
CREATE POLICY "authenticated insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by_user_id = public.current_user_profile_id()
  AND public.case_write_allowed(case_type, case_id)
);
