-- Realtime: dashboard "recente activiteit" kan live meeveren met workflow_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workflow_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_events;
  END IF;
END $$;
