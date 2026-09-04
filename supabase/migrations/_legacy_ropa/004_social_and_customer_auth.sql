-- Agregar campos de contacto social a store_config
alter table store_config
  add column if not exists whatsapp_number text,
  add column if not exists instagram_url   text,
  add column if not exists tiktok_url      text,
  add column if not exists tagline         text;

-- Política RLS: clientes ven sus propios pedidos
create policy "customers_read_own_orders"
  on orders for select
  using (auth.uid() = user_id);

-- Política RLS: clientes ven sus propios items
create policy "customers_read_own_order_items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );
