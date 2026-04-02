-- Products uitbreiden
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS age_group TEXT[],
  ADD COLUMN IF NOT EXISTS is_package BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_components JSONB;

-- Hardware Pakketten
INSERT INTO public.products (id, sku, name, category, description, age_group, is_package, package_components, active, specification_summary)
VALUES
  ('pkg-6-12', 'PKG-LAPTOP-6-12', 'Laptoppakket 6-12 jaar', 'laptop',
   'Compleet pakket voor kinderen 6-12 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-12'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding']),
  ('pkg-12-18', 'PKG-LAPTOP-12-18', 'Laptoppakket 12-18 jaar', 'laptop',
   'Compleet pakket voor jongeren 12-18 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['12-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding']),
  ('pkg-universal', 'PKG-LAPTOP-UNI', 'Laptoppakket Universeel (6-18)', 'laptop',
   'Compleet pakket voor alle leeftijden: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1},{"product_id":"prod-handleiding","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak', 'Handleiding'])
ON CONFLICT (id) DO NOTHING;

-- Losse accessoires/componenten
INSERT INTO public.products (id, sku, name, category, description, active, specification_summary)
VALUES
  ('prod-muis', 'ACC-MUIS', 'Muis', 'accessory', 'Computermuis', true, ARRAY['USB muis']),
  ('prod-headset', 'ACC-HEADSET', 'Headset', 'accessory', 'Headset met microfoon', true, ARRAY['Over-ear headset']),
  ('prod-rugzak', 'ACC-RUGZAK', 'Rugzak', 'accessory', 'Laptoptas/rugzak', true, ARRAY['Rugzak']),
  ('prod-handleiding', 'ACC-HANDLEIDING', 'Handleiding', 'accessory', 'Gebruikershandleiding', true, ARRAY['Gedrukte handleiding']),
  ('prod-stickers', 'ACC-STICKERS', 'Stickers', 'accessory', 'Digidromen stickers', true, ARRAY['Stickervel']),
  ('prod-voedingskabel', 'ACC-VOEDING', 'Voedingskabel', 'accessory', 'Laptop voedingsadapter', true, ARRAY['Voedingsadapter'])
ON CONFLICT (id) DO NOTHING;
