alter table public.inventory_items
  add column if not exists incoming_quantity integer not null default 0,
  add column if not exists incoming_eta date;

insert into public.products (
  id,
  sku,
  name,
  category,
  description,
  stock_on_hand,
  stock_reserved,
  specification_summary,
  active
)
values (
  'product-laptop',
  'LAPTOP-CANONICAL',
  'Laptop',
  'laptop',
  'Geaggregeerde laptopvoorraad voor uitlevering en service.',
  0,
  0,
  '{"Laptop"}',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  active = true;

update public.order_lines
set product_id = 'product-laptop'
where product_id <> 'product-laptop';

update public.inventory_items
set product_id = 'product-laptop'
where product_id <> 'product-laptop';

update public.products
set active = false
where id <> 'product-laptop';

with laptop_totals as (
  select
    coalesce(sum(quantity), 0) as stock_on_hand,
    coalesce(sum(greatest(quantity - available_quantity, 0)), 0) as stock_reserved
  from public.inventory_items
  where product_id = 'product-laptop'
    and serial_number is null
)
update public.products
set
  stock_on_hand = laptop_totals.stock_on_hand,
  stock_reserved = laptop_totals.stock_reserved
from laptop_totals
where public.products.id = 'product-laptop';
