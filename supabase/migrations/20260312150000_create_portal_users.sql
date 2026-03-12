insert into public.user_profiles (id, auth_user_id, organization_id, role, name, email, title, avatar_label)
values
  ('user-digidromen-pauline', null, 'org-digidromen', 'digidromen_staff', 'Pauline', 'pauline@digidromen.nl', 'Operations', 'PA'),
  ('user-joris-eyeti', null, 'org-digidromen', 'digidromen_admin', 'Joris Zwanenburg', 'joris.zwanenburg@eyeti.nl', 'Platform beheer', 'JZ')
on conflict (id) do update
set organization_id = excluded.organization_id,
    role = excluded.role,
    name = excluded.name,
    email = excluded.email,
    title = excluded.title,
    avatar_label = excluded.avatar_label;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower('pauline@digidromen.nl');
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'pauline@digidromen.nl',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set encrypted_password = crypt('test123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, 'pauline@digidromen.nl')::jsonb,
    'email',
    'pauline@digidromen.nl',
    now(),
    now(),
    now()
  where not exists (
    select 1 from auth.identities where provider = 'email' and provider_id = 'pauline@digidromen.nl'
  );
end $$;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower('karin@digidromen.nl');
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'karin@digidromen.nl',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set encrypted_password = crypt('test123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, 'karin@digidromen.nl')::jsonb,
    'email',
    'karin@digidromen.nl',
    now(),
    now(),
    now()
  where not exists (
    select 1 from auth.identities where provider = 'email' and provider_id = 'karin@digidromen.nl'
  );
end $$;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower('joris.zwanenburg@eyeti.nl');
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'joris.zwanenburg@eyeti.nl',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set encrypted_password = crypt('test123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, 'joris.zwanenburg@eyeti.nl')::jsonb,
    'email',
    'joris.zwanenburg@eyeti.nl',
    now(),
    now(),
    now()
  where not exists (
    select 1 from auth.identities where provider = 'email' and provider_id = 'joris.zwanenburg@eyeti.nl'
  );
end $$;

update public.user_profiles up
set auth_user_id = au.id
from auth.users au
where lower(up.email) = lower(au.email)
  and up.email in ('pauline@digidromen.nl', 'karin@digidromen.nl', 'joris.zwanenburg@eyeti.nl');
