DO $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  SELECT id
  INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = lower('joris.zwanenburg@eyeti.nl')
  LIMIT 1;

  INSERT INTO public.user_profiles (
    id,
    auth_user_id,
    organization_id,
    role,
    name,
    email,
    title,
    avatar_label
  )
  VALUES (
    'user-joris-eyeti',
    v_auth_user_id,
    'org-digidromen',
    'digidromen_admin',
    'Joris Zwanenburg',
    'joris.zwanenburg@eyeti.nl',
    'Platform beheer',
    'JZ'
  )
  ON CONFLICT (id) DO UPDATE
  SET auth_user_id = COALESCE(EXCLUDED.auth_user_id, public.user_profiles.auth_user_id),
      organization_id = EXCLUDED.organization_id,
      role = EXCLUDED.role,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      title = EXCLUDED.title,
      avatar_label = EXCLUDED.avatar_label;
END
$$;
