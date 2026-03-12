truncate table
  public.notification_role_scope,
  public.notifications,
  public.documents,
  public.messages,
  public.workflow_events,
  public.order_lines,
  public.orders,
  public.repair_cases,
  public.donation_batches,
  public.crm_sync_jobs
restart identity cascade;

delete from public.inventory_items
where id in (
  'inventory-dell-bulk',
  'inventory-lenovo-bulk',
  'inventory-mouse-bulk',
  'inventory-repair-tp13002'
);

delete from public.products
where id in (
  'product-dell-14',
  'product-lenovo-13',
  'product-sleeve-14',
  'product-mouse'
);

delete from public.user_profiles
where id in (
  'user-help-amsterdam',
  'user-help-rotterdam',
  'user-help-eindhoven',
  'user-digidromen-staff',
  'user-service-partner'
);

delete from public.organizations
where id in (
  'org-help-amsterdam',
  'org-help-rotterdam',
  'org-help-eindhoven',
  'org-servicepartner',
  'org-sponsor-techforgood',
  'org-sponsor-nexbyte'
);
