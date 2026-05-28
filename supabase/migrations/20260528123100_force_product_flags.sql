-- Forceer idempotent de product-flags die nodig zijn voor RMA/replacement flow.
-- Voorkomt fouten als oudere data-migraties niet helemaal hebben gedraaid.

UPDATE public.products
SET is_orderable = true,
    is_replacement_product = true,
    active = true
WHERE id IN ('prod-muis', 'prod-rugzak', 'prod-headset', 'prod-powerbank');

UPDATE public.products
SET is_orderable = true,
    active = true
WHERE id = 'prod-voedingskabel';

-- chk_rma_category constraint moet 'headset' bevatten (in migration 20260416140000)
-- Idempotent via DROP IF EXISTS + ADD (al gedaan in 20260528122832 maar veilig dubbel)
ALTER TABLE public.order_lines DROP CONSTRAINT IF EXISTS chk_rma_category;
ALTER TABLE public.order_lines
  ADD CONSTRAINT chk_rma_category CHECK (
    rma_category IS NULL
    OR rma_category IN ('laptop', 'voedingskabel', 'randapparatuur', 'powerbank', 'muis', 'rugzak', 'headset')
  );
