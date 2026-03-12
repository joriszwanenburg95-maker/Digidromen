create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('help_org', 'digidromen_staff', 'digidromen_admin', 'service_partner');
  end if;
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type public.organization_type as enum ('help_org', 'digidromen', 'service_partner', 'sponsor');
  end if;
  if not exists (select 1 from pg_type where typname = 'product_category') then
    create type public.product_category as enum ('laptop', 'accessory', 'service');
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_condition') then
    create type public.inventory_condition as enum ('new', 'refurbished', 'damaged', 'reserved', 'in_repair');
  end if;
  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type public.priority_level as enum ('low', 'normal', 'high', 'urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'INGEDIEND',
      'BEOORDEELD',
      'IN_BEHANDELING',
      'IN_VOORBEREIDING',
      'VERZONDEN',
      'GELEVERD',
      'AFGESLOTEN',
      'GEANNULEERD'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'repair_status') then
    create type public.repair_status as enum (
      'ONTVANGEN',
      'DIAGNOSE',
      'IN_REPARATIE',
      'TEST',
      'RETOUR',
      'IRREPARABEL',
      'AFGESLOTEN'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'repair_subtype') then
    create type public.repair_subtype as enum ('GENERAL_REPAIR', 'ACCESSORY_ISSUE');
  end if;
  if not exists (select 1 from pg_type where typname = 'donation_status') then
    create type public.donation_status as enum (
      'TOEGEZEGD',
      'OPHAALAFSPRAAK_GEPLAND',
      'OPGEHAALD',
      'AANGEKOMEN_WAREHOUSE',
      'IN_VERWERKING',
      'RAPPORTAGE_GEREED',
      'OP_VOORRAAD'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'case_type') then
    create type public.case_type as enum ('order', 'repair', 'donation');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('email', 'portal', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_level') then
    create type public.notification_level as enum ('info', 'success', 'warning', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_kind') then
    create type public.message_kind as enum ('internal', 'manual', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type public.document_kind as enum (
      'request_attachment',
      'repair_report',
      'shipping_note',
      'pickup_note',
      'donation_report',
      'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'document_storage_mode') then
    create type public.document_storage_mode as enum ('metadata_only', 'supabase_storage', 'crm_reference');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_sync_state') then
    create type public.crm_sync_state as enum ('queued', 'synced', 'failed', 'retrying');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_entity_name') then
    create type public.crm_entity_name as enum ('organization', 'order', 'repair', 'donation', 'document', 'task');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  type public.organization_type not null,
  city text not null,
  contact_name text not null,
  contact_email text not null,
  active boolean not null default true,
  crm_relation_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_profiles (
  id text primary key,
  auth_user_id uuid unique,
  organization_id text not null references public.organizations(id) on delete restrict,
  role public.app_role not null,
  name text not null,
  email text not null unique,
  title text,
  phone text,
  avatar_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select up.role
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_organization_id()
returns text
language sql
stable
as $$
  select up.organization_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('digidromen_staff', 'digidromen_admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'digidromen_admin'
$$;

create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category public.product_category not null,
  description text not null,
  stock_on_hand integer not null default 0,
  stock_reserved integer not null default 0,
  specification_summary text[] not null default '{}',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_items (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  serial_number text,
  warehouse_location text not null,
  condition public.inventory_condition not null,
  quantity integer not null default 0,
  available_quantity integer not null default 0,
  source_donation_batch_id text,
  assigned_order_id text,
  last_mutation_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete restrict,
  requester_user_id text not null references public.user_profiles(id) on delete restrict,
  status public.order_status not null,
  priority public.priority_level not null default 'normal',
  preferred_delivery_date date,
  requested_at timestamptz not null,
  motivation text not null,
  delivery_address text not null,
  stock_badge text not null,
  assigned_service_partner_id text references public.organizations(id) on delete set null,
  crm_relation_id text,
  crm_case_id text,
  crm_task_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_lines (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.repair_cases (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete restrict,
  requester_user_id text not null references public.user_profiles(id) on delete restrict,
  status public.repair_status not null,
  subtype public.repair_subtype not null,
  serial_number text not null,
  issue_type text not null,
  notes text not null,
  photo_placeholder_count integer not null default 0,
  received_at timestamptz not null,
  assigned_service_partner_id text references public.organizations(id) on delete set null,
  replacement_offered boolean,
  crm_relation_id text,
  crm_case_id text,
  crm_task_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_batches (
  id text primary key,
  sponsor_organization_id text not null references public.organizations(id) on delete restrict,
  status public.donation_status not null,
  device_count_promised integer not null default 0,
  pickup_address text not null,
  pickup_contact_name text not null,
  pickup_contact_email text not null,
  pickup_window text,
  registered_at timestamptz not null,
  assigned_service_partner_id text references public.organizations(id) on delete set null,
  refurbish_ready_count integer,
  rejected_count integer,
  notes text,
  crm_relation_id text,
  crm_case_id text,
  crm_task_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_events (
  id text primary key,
  case_type public.case_type not null,
  case_id text not null,
  status text not null,
  title text not null,
  description text not null,
  created_at timestamptz not null,
  actor_role text not null,
  actor_name text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.messages (
  id text primary key,
  case_type public.case_type not null,
  case_id text not null,
  author_user_id text references public.user_profiles(id) on delete set null,
  author_role text not null,
  author_name text not null,
  kind public.message_kind not null default 'manual',
  body text not null,
  created_at timestamptz not null,
  internal_only boolean not null default false,
  attachment_document_ids text[] not null default '{}'
);

create table if not exists public.documents (
  id text primary key,
  case_type public.case_type not null,
  case_id text not null,
  file_name text not null,
  file_size_label text not null,
  mime_type text not null,
  uploaded_at timestamptz not null,
  uploaded_by_user_id text references public.user_profiles(id) on delete set null,
  uploaded_by_name text not null,
  kind public.document_kind not null,
  storage_mode public.document_storage_mode not null default 'metadata_only',
  storage_path text,
  crm_document_id text,
  notes text
);

create table if not exists public.notifications (
  id text primary key,
  title text not null,
  body text not null,
  created_at timestamptz not null,
  channel public.notification_channel not null,
  level public.notification_level not null,
  related_case_type public.case_type,
  related_case_id text
);

create table if not exists public.notification_role_scope (
  notification_id text not null references public.notifications(id) on delete cascade,
  role public.app_role not null,
  is_read boolean not null default false,
  primary key (notification_id, role)
);

create table if not exists public.crm_sync_jobs (
  id text primary key,
  case_type public.case_type not null,
  case_id text not null,
  state public.crm_sync_state not null default 'queued',
  entity_name public.crm_entity_name not null,
  buffered_changes text[] not null default '{}',
  last_attempt_at timestamptz,
  last_successful_sync_at timestamptz,
  failure_reason text,
  retry_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_organization_id on public.orders(organization_id);
create index if not exists idx_orders_assigned_service_partner_id on public.orders(assigned_service_partner_id);
create index if not exists idx_repair_cases_organization_id on public.repair_cases(organization_id);
create index if not exists idx_repair_cases_assigned_service_partner_id on public.repair_cases(assigned_service_partner_id);
create index if not exists idx_donation_batches_sponsor_organization_id on public.donation_batches(sponsor_organization_id);
create index if not exists idx_donation_batches_assigned_service_partner_id on public.donation_batches(assigned_service_partner_id);
create index if not exists idx_workflow_events_case on public.workflow_events(case_type, case_id, created_at desc);
create index if not exists idx_messages_case on public.messages(case_type, case_id, created_at desc);
create index if not exists idx_documents_case on public.documents(case_type, case_id, uploaded_at desc);
create index if not exists idx_crm_sync_jobs_case on public.crm_sync_jobs(case_type, case_id, updated_at desc);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute procedure public.set_updated_at();
drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at before update on public.inventory_items for each row execute procedure public.set_updated_at();
drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
drop trigger if exists set_repair_cases_updated_at on public.repair_cases;
create trigger set_repair_cases_updated_at before update on public.repair_cases for each row execute procedure public.set_updated_at();
drop trigger if exists set_donation_batches_updated_at on public.donation_batches;
create trigger set_donation_batches_updated_at before update on public.donation_batches for each row execute procedure public.set_updated_at();
drop trigger if exists set_crm_sync_jobs_updated_at on public.crm_sync_jobs;
create trigger set_crm_sync_jobs_updated_at before update on public.crm_sync_jobs for each row execute procedure public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.products enable row level security;
alter table public.inventory_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.repair_cases enable row level security;
alter table public.donation_batches enable row level security;
alter table public.workflow_events enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_role_scope enable row level security;
alter table public.crm_sync_jobs enable row level security;

drop policy if exists "authenticated read organizations" on public.organizations;
create policy "authenticated read organizations" on public.organizations for select to authenticated using (true);
drop policy if exists "staff manage organizations" on public.organizations;
create policy "staff manage organizations" on public.organizations for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "users read profiles" on public.user_profiles;
create policy "users read profiles" on public.user_profiles for select to authenticated using (true);
drop policy if exists "admin manage profiles" on public.user_profiles;
create policy "admin manage profiles" on public.user_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read products" on public.products;
create policy "authenticated read products" on public.products for select to authenticated using (true);
drop policy if exists "staff manage products" on public.products;
create policy "staff manage products" on public.products for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "authenticated read inventory" on public.inventory_items;
create policy "authenticated read inventory" on public.inventory_items for select to authenticated using (true);
drop policy if exists "staff or service partner manage inventory" on public.inventory_items;
create policy "staff or service partner manage inventory" on public.inventory_items for all to authenticated using (
  public.is_staff_or_admin() or public.current_app_role() = 'service_partner'
) with check (
  public.is_staff_or_admin() or public.current_app_role() = 'service_partner'
);

drop policy if exists "authenticated read orders" on public.orders;
create policy "authenticated read orders" on public.orders for select to authenticated using (true);
drop policy if exists "help org create own orders or staff manage" on public.orders;
create policy "help org create own orders or staff manage" on public.orders for insert to authenticated with check (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
    and requester_user_id in (
      select up.id from public.user_profiles up where up.auth_user_id = auth.uid()
    )
  )
);
drop policy if exists "order updates by staff own org or service partner" on public.orders;
create policy "order updates by staff own org or service partner" on public.orders for update to authenticated using (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
  )
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
) with check (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
  )
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
);

drop policy if exists "authenticated read order lines" on public.order_lines;
create policy "authenticated read order lines" on public.order_lines for select to authenticated using (true);
drop policy if exists "order lines managed with orders" on public.order_lines;
create policy "order lines managed with orders" on public.order_lines for all to authenticated using (
  public.is_staff_or_admin() or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        o.organization_id = public.current_organization_id()
        or o.assigned_service_partner_id = public.current_organization_id()
      )
  )
) with check (
  public.is_staff_or_admin() or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        o.organization_id = public.current_organization_id()
        or o.assigned_service_partner_id = public.current_organization_id()
      )
  )
);

drop policy if exists "authenticated read repairs" on public.repair_cases;
create policy "authenticated read repairs" on public.repair_cases for select to authenticated using (true);
drop policy if exists "repair create own org or staff" on public.repair_cases;
create policy "repair create own org or staff" on public.repair_cases for insert to authenticated with check (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
  )
);
drop policy if exists "repair updates by staff or service partner" on public.repair_cases;
create policy "repair updates by staff or service partner" on public.repair_cases for update to authenticated using (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
  )
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
) with check (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'help_org'
    and organization_id = public.current_organization_id()
  )
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
);

drop policy if exists "authenticated read donations" on public.donation_batches;
create policy "authenticated read donations" on public.donation_batches for select to authenticated using (true);
drop policy if exists "staff create donations" on public.donation_batches;
create policy "staff create donations" on public.donation_batches for insert to authenticated with check (
  public.is_staff_or_admin()
);
drop policy if exists "donation updates by staff or service partner" on public.donation_batches;
create policy "donation updates by staff or service partner" on public.donation_batches for update to authenticated using (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
) with check (
  public.is_staff_or_admin()
  or (
    public.current_app_role() = 'service_partner'
    and assigned_service_partner_id = public.current_organization_id()
  )
);

drop policy if exists "authenticated read workflow events" on public.workflow_events;
create policy "authenticated read workflow events" on public.workflow_events for select to authenticated using (true);
drop policy if exists "staff manage workflow events" on public.workflow_events;
create policy "staff manage workflow events" on public.workflow_events for insert to authenticated with check (
  public.is_staff_or_admin() or public.current_app_role() = 'service_partner'
);

drop policy if exists "authenticated read messages" on public.messages;
create policy "authenticated read messages" on public.messages for select to authenticated using (true);
drop policy if exists "authenticated insert messages" on public.messages;
create policy "authenticated insert messages" on public.messages for insert to authenticated with check (true);

drop policy if exists "authenticated read documents" on public.documents;
create policy "authenticated read documents" on public.documents for select to authenticated using (true);
drop policy if exists "authenticated insert documents" on public.documents;
create policy "authenticated insert documents" on public.documents for insert to authenticated with check (true);

drop policy if exists "authenticated read notifications" on public.notifications;
create policy "authenticated read notifications" on public.notifications for select to authenticated using (true);
drop policy if exists "staff manage notifications" on public.notifications;
create policy "staff manage notifications" on public.notifications for all to authenticated using (
  public.is_staff_or_admin()
) with check (
  public.is_staff_or_admin()
);

drop policy if exists "authenticated read notification roles" on public.notification_role_scope;
create policy "authenticated read notification roles" on public.notification_role_scope for select to authenticated using (true);
drop policy if exists "authenticated update own notification role rows" on public.notification_role_scope;
create policy "authenticated update own notification role rows" on public.notification_role_scope for update to authenticated using (
  role = public.current_app_role()
) with check (
  role = public.current_app_role()
);

drop policy if exists "authenticated read crm jobs" on public.crm_sync_jobs;
create policy "authenticated read crm jobs" on public.crm_sync_jobs for select to authenticated using (true);
drop policy if exists "staff manage crm jobs" on public.crm_sync_jobs;
create policy "staff manage crm jobs" on public.crm_sync_jobs for all to authenticated using (
  public.is_staff_or_admin()
) with check (
  public.is_staff_or_admin()
);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
