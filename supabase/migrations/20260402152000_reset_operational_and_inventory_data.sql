-- One-time reset for operational and inventory data.
-- Keeps organizations, user profiles, auth users, and portal configuration intact.

TRUNCATE TABLE
  public.repair_logs,
  public.notification_role_scope,
  public.notifications,
  public.documents,
  public.messages,
  public.workflow_events,
  public.order_lines,
  public.orders,
  public.repair_cases,
  public.donation_batches,
  public.crm_sync_jobs,
  public.audit_log,
  public.forecast_snapshots,
  public.inventory_items,
  public.stock_locations,
  public.products
RESTART IDENTITY CASCADE;
