-- Breidt de e-mailtrigger uit: naast de bevestiging bij indienen ook een
-- bevestiging bij accordering en een update bij het zetten/wijzigen van de
-- verzend-/bezorgdatum. Alles wordt in email_outbox geplaatst (verstuurd door
-- process-email-outbox). Verstuurt zelf niets.

create or replace function public.enqueue_order_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_email   text;
  v_type    text := null;
begin
  -- Bepaal of (en welk type) er gemaild moet worden.
  if TG_OP = 'INSERT' then
    if NEW.status = 'ingediend' then
      v_type := 'order_confirmation';
    end if;
  else -- UPDATE
    if NEW.status = 'ingediend' and OLD.status is distinct from 'ingediend' then
      v_type := 'order_confirmation';
    elsif NEW.status = 'geaccordeerd' and OLD.status is distinct from 'geaccordeerd' then
      v_type := 'order_approved';
    elsif NEW.status = 'geleverd' and OLD.status is distinct from 'geleverd' then
      v_type := 'order_update';
    elsif NEW.delivery_date is not null
          and NEW.delivery_date is distinct from OLD.delivery_date then
      v_type := 'order_update';
    end if;
  end if;

  if v_type is null then
    return NEW;
  end if;

  -- Ontvanger = de besteller (inlog-e-mail), val terug op org-contactmail.
  select up.id, up.email
    into v_user_id, v_email
  from public.user_profiles up
  where up.id = NEW.requester_user_id;

  if v_email is null or btrim(v_email) = '' then
    select o.contact_email
      into v_email
    from public.organizations o
    where o.id = NEW.organization_id;
  end if;

  if v_email is null or btrim(v_email) = '' then
    return NEW;
  end if;

  insert into public.email_outbox (
    email_type, recipient_user_id, recipient_email,
    organization_id, order_id, payload
  )
  values (
    v_type, v_user_id, v_email,
    NEW.organization_id, NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'status', NEW.status,
      'delivery_date', NEW.delivery_date
    )
  );

  return NEW;
end;
$$;

-- Vervang de oude (alleen-bevestiging) trigger/functie.
drop trigger if exists trg_enqueue_order_confirmation on public.orders;
drop trigger if exists trg_enqueue_order_email on public.orders;
create trigger trg_enqueue_order_email
  after insert or update of status, delivery_date on public.orders
  for each row
  execute function public.enqueue_order_email();

drop function if exists public.enqueue_order_confirmation();

-- Sta de nieuwe mailtypes toe in de outbox-check.
alter table public.email_outbox drop constraint if exists email_outbox_email_type_check;

comment on function public.enqueue_order_email() is
  'Plaatst order-mails in email_outbox: bevestiging (ingediend), goedkeuring (geaccordeerd) en update (geleverd of nieuwe verzend-/bezorgdatum).';
