-- Hulporganisatie: eigen user_profiles-rij bijwerken (naam, telefoon), zonder rol/org te wijzigen.

CREATE OR REPLACE FUNCTION public.prevent_user_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.role IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'Je mag alleen naam, telefoon en aanvullende velden van je eigen profiel wijzigen.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_privilege_escalation();

DROP POLICY IF EXISTS "users update own profile" ON public.user_profiles;
CREATE POLICY "users update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
