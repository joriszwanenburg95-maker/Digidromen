-- E-mailinfrastructuur: outbox-patroon voor gebundelde bevestigingen + verzendlog.
--
-- Strategie:
-- - Bij indienen van een bestelling zet een trigger één regel in email_outbox
--   (status 'pending'). Er wordt NIET direct gemaild.
-- - Een geplande edge function (process-email-outbox) bundelt openstaande regels
--   per besteller tot één verzamelmail en markeert ze als 'sent'. Zo krijg je bij
--   meerdere bestellingen vlak na elkaar één mail i.p.v. één per bestelling.
-- - email_send_log voorkomt dubbele verzending van periodieke mails
--   (bijv. de "bestelvenster open"-mail: één keer per maand per ontvanger).
--
-- Veilig om nu toe te passen: deze migratie verstuurt zelf niets.

-- ── Outbox ────────────────────────────────────────────────────────────────
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  email_type text not null default 'order_confirmation',
  recipient_user_id text,
  recipient_email text not null,
  organization_id text,
  order_id text references public.orders(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'error')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_email_outbox_pending
  on public.email_outbox (status, created_at)
  where status = 'pending';

create index if not exists idx_email_outbox_recipient
  on public.email_outbox (recipient_email, status);

alter table public.email_outbox enable row level security;
-- Geen policies: alleen de service role (edge functions) mag erbij. RLS zonder
-- policies blokkeert anon/authenticated volledig.

-- ── Verzendlog (dedupe voor periodieke mails) ───────────────────────────────
create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,
  dedupe_key text not null,
  recipient_email text not null,
  created_at timestamptz not null default now(),
  unique (email_type, dedupe_key, recipient_email)
);

alter table public.email_send_log enable row level security;

-- ── Trigger: bevestiging in de wachtrij bij indienen ────────────────────────
create or replace function public.enqueue_order_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_email   text;
begin
  -- Alleen bij overgang naar 'ingediend'.
  if NEW.status <> 'ingediend' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.status = 'ingediend' then
    return NEW; -- al verwerkt, geen dubbele mail
  end if;

  -- Ontvanger = de besteller (inlog-e-mail). Val terug op org-contactmail.
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
    return NEW; -- geen ontvanger bekend
  end if;

  insert into public.email_outbox (
    email_type, recipient_user_id, recipient_email,
    organization_id, order_id, payload
  )
  values (
    'order_confirmation', v_user_id, v_email,
    NEW.organization_id, NEW.id,
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_order_confirmation on public.orders;
create trigger trg_enqueue_order_confirmation
  after insert or update of status on public.orders
  for each row
  execute function public.enqueue_order_confirmation();

comment on table public.email_outbox is
  'Wachtrij voor uitgaande mails. Wordt gebundeld verzonden door de edge function process-email-outbox.';
comment on table public.email_send_log is
  'Dedupe-log voor periodieke mails (bijv. bestelvenster-open per maand per ontvanger).';
