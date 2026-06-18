-- ════════════════════════════════════════════════════════════════════════
-- HOTFIX: rol-recursie in de user_profiles SELECT-policy.
--
-- In 20260618120000 is de user_profiles SELECT-policy org-gescope't via de
-- SECURITY DEFINER-helpers current_user_org_id_sd()/current_user_is_staff_sd().
-- In dit project bypass't SECURITY DEFINER de RLS op user_profiles NIET, dus
-- elke lees-actie op user_profiles trof de policy → helper → user_profiles →
-- policy → ... = "stack depth limit exceeded" (o.a. bij het indienen van een
-- bestelling, want de order-triggers lezen user_profiles).
--
-- We zetten de policy terug op de gedocumenteerde, niet-recursieve vorm
-- (USING(true), zie AGENTS.md). De org-scoping van PII verdient een
-- niet-recursieve oplossing (JWT-claim met organization_id) — apart traject.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users read profiles" ON public.user_profiles;
CREATE POLICY "users read profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Niet langer gebruikte helpers opruimen (voorkomt hergebruik in policies).
DROP FUNCTION IF EXISTS public.current_user_org_id_sd();
DROP FUNCTION IF EXISTS public.current_user_is_staff_sd();
