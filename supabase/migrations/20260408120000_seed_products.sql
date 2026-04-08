-- Herstel productcatalogus na data-reset
-- Laptop pakketten (new_request flow)
INSERT INTO public.products (id, sku, name, category, description, age_group, is_package, package_components, active, specification_summary, order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES
  ('pkg-6-12', 'PKG-LAPTOP-6-12', 'Laptoppakket 6-12 jaar', 'laptop',
   'Compleet pakket voor kinderen 6-12 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-12'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak'],
   'new_request', true, false, true, 'pakket'),
  ('pkg-12-18', 'PKG-LAPTOP-12-18', 'Laptoppakket 12-18 jaar', 'laptop',
   'Compleet pakket voor jongeren 12-18 jaar: laptop, muis, headset, rugzak, handleiding',
   ARRAY['12-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak'],
   'new_request', true, false, true, 'pakket'),
  ('pkg-universal', 'PKG-LAPTOP-UNI', 'Laptoppakket Universeel (6-18)', 'laptop',
   'Compleet pakket voor alle leeftijden: laptop, muis, headset, rugzak, handleiding',
   ARRAY['6-18'], true,
   '[{"product_id":"prod-laptop","qty":1},{"product_id":"prod-muis","qty":1},{"product_id":"prod-headset","qty":1},{"product_id":"prod-rugzak","qty":1}]'::jsonb,
   true, ARRAY['Laptop', 'Muis', 'Headset', 'Rugzak'],
   'new_request', true, false, true, 'pakket')
ON CONFLICT (id) DO NOTHING;

-- Losse hardware (replacement flows)
INSERT INTO public.products (id, sku, name, category, description, active, specification_summary, order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES
  ('prod-laptop', 'HW-LAPTOP', 'Laptop', 'laptop',
   'Refurbished laptop voor vervanging', true, ARRAY['Refurbished laptop'],
   'replacement', true, true, true, 'stuk'),
  ('prod-voedingskabel', 'ACC-VOEDING', 'Voedingskabel', 'accessory',
   'Laptop voedingsadapter', true, ARRAY['Voedingsadapter'],
   'replacement', true, true, true, 'stuk'),
  ('prod-powerbank', 'PB-001', 'Powerbank', 'accessory',
   'Vervanging powerbank voor laptoppakket', true, ARRAY['Powerbank'],
   'replacement', true, true, true, 'stuk')
ON CONFLICT (id) DO NOTHING;

-- Overige accessoires
INSERT INTO public.products (id, sku, name, category, description, active, specification_summary, order_scenario, is_orderable, is_replacement_product, inventory_managed, unit)
VALUES
  ('prod-muis', 'ACC-MUIS', 'Muis', 'accessory', 'Computermuis', true, ARRAY['USB muis'], 'accessory', false, false, true, 'stuk'),
  ('prod-headset', 'ACC-HEADSET', 'Headset', 'accessory', 'Headset met microfoon', true, ARRAY['Over-ear headset'], 'accessory', false, false, true, 'stuk'),
  ('prod-rugzak', 'ACC-RUGZAK', 'Rugzak', 'accessory', 'Laptoptas/rugzak', true, ARRAY['Rugzak'], 'accessory', false, false, true, 'stuk'),
  ('prod-handleiding', 'ACC-HANDLEIDING', 'Handleiding', 'accessory', 'Gebruikershandleiding', true, ARRAY['Gedrukte handleiding'], 'accessory', false, false, false, 'stuk'),
  ('prod-stickers', 'ACC-STICKERS', 'Stickers', 'accessory', 'Digidromen stickers', true, ARRAY['Stickervel'], 'accessory', false, false, false, 'stuk')
ON CONFLICT (id) DO NOTHING;
