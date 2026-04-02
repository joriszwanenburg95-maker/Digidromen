CREATE TABLE IF NOT EXISTS public.audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

-- Audit trigger functie
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id TEXT;
  _user_email TEXT;
BEGIN
  SELECT up.id, up.email INTO _user_id, _user_email
  FROM public.user_profiles up
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

-- Triggers op key tabellen
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_repair_cases AFTER INSERT OR UPDATE OR DELETE ON public.repair_cases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_donation_batches AFTER INSERT OR UPDATE OR DELETE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_inventory_items AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
