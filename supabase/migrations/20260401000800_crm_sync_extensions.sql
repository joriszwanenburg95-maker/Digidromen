ALTER TABLE public.crm_sync_jobs
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS hubspot_object_type TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_object_id TEXT,
  ADD COLUMN IF NOT EXISTS field_changes JSONB;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS crm_hubspot_id TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;
