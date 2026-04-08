-- Fix: orders_set_approved_at trigger gebruikt de verouderde enum waarde 'BEOORDEELD'
-- die na portal_redesign_schema niet meer bestaat.
-- Vervang door de nieuwe logica (sync naar 'geaccordeerd').

CREATE OR REPLACE FUNCTION public.orders_set_approved_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'geaccordeerd' AND (OLD.status IS DISTINCT FROM 'geaccordeerd') AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;
