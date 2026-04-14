-- Handmatig bestelvenster open voor hulporganisaties (beheer via portal_config.force_open_help_org).

DROP FUNCTION IF EXISTS public.check_ordering_window();

CREATE OR REPLACE FUNCTION public.is_ordering_window_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  open_day int;
  close_day int;
  today_day int;
  forced boolean;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  IF cfg IS NULL THEN RETURN true; END IF;

  forced := coalesce((cfg->>'force_open_help_org')::boolean, false);
  IF forced THEN RETURN true; END IF;

  open_day  := (cfg->>'open_day')::int;
  close_day := (cfg->>'close_day')::int;
  today_day := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;

  RETURN today_day BETWEEN open_day AND close_day;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_ordering_window()
RETURNS TABLE(is_open boolean, open_day int, close_day int, today_day int, forced_open_help_org boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  o int;
  c int;
  t int;
  forced boolean;
  cal_open boolean;
BEGIN
  SELECT value INTO cfg FROM public.portal_config WHERE key = 'ordering_windows';
  o := coalesce((cfg->>'open_day')::int, 1);
  c := coalesce((cfg->>'close_day')::int, 7);
  t := extract(day from (now() AT TIME ZONE 'Europe/Amsterdam'))::int;
  forced := coalesce((cfg->>'force_open_help_org')::boolean, false);
  cal_open := (t BETWEEN o AND c);
  RETURN QUERY SELECT (cal_open OR forced), o, c, t, forced;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ordering_window() TO authenticated;
