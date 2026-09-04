-- ============================================================
-- MobilSa · 002 — Row Level Security
-- Aislamiento por negocio (store_id). Correr DESPUÉS de 001.
--
-- Modelo:
--  · Catálogo/menú: lectura pública (son escaparates públicos). La app SIEMPRE
--    filtra por store_id; el aislamiento de escritura es lo que importa.
--  · Escritura de catálogo/menú/config: solo staff del negocio o super_admin.
--  · Pedidos/reservas: el cliente ve los suyos; el staff ve los de su negocio.
--    La creación pública pasa por rutas API con service_role (saltea RLS).
-- ============================================================

alter table store_config        enable row level security;
alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table products            enable row level security;
alter table product_variants    enable row level security;
alter table carts               enable row level security;
alter table cart_items          enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table menu_categorias     enable row level security;
alter table menu_platos         enable row level security;
alter table reservaciones       enable row level security;
alter table pedidos_restaurante enable row level security;
alter table pagos_verificacion  enable row level security;
alter table conversaciones_bot  enable row level security;
alter table addresses           enable row level security;

-- ---------- store_config ----------
drop policy if exists store_config_public_read on store_config;
create policy store_config_public_read on store_config
  for select using (true);

drop policy if exists store_config_staff_write on store_config;
create policy store_config_staff_write on store_config
  for update using (is_store_staff(id)) with check (is_store_staff(id));

drop policy if exists store_config_superadmin_insert on store_config;
create policy store_config_superadmin_insert on store_config
  for insert with check (is_super_admin());

drop policy if exists store_config_superadmin_delete on store_config;
create policy store_config_superadmin_delete on store_config
  for delete using (is_super_admin());

-- ---------- profiles ----------
drop policy if exists profiles_select_self_or_staff on profiles;
create policy profiles_select_self_or_staff on profiles
  for select using (
    id = auth.uid()
    or is_super_admin()
    or (store_id is not null and store_id = current_store_id())
  );

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = auth.uid());

-- ---------- categories / products / product_variants ----------
drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories
  for select using (active = true or is_store_staff(store_id));
drop policy if exists categories_staff_write on categories;
create policy categories_staff_write on categories
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select using (active = true or is_store_staff(store_id));
drop policy if exists products_staff_write on products;
create policy products_staff_write on products
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

drop policy if exists variants_public_read on product_variants;
create policy variants_public_read on product_variants
  for select using (
    exists (select 1 from products p where p.id = product_variants.product_id
            and (p.active = true or is_store_staff(p.store_id)))
  );
drop policy if exists variants_staff_write on product_variants;
create policy variants_staff_write on product_variants
  for all using (
    exists (select 1 from products p where p.id = product_variants.product_id
            and is_store_staff(p.store_id))
  ) with check (
    exists (select 1 from products p where p.id = product_variants.product_id
            and is_store_staff(p.store_id))
  );

-- ---------- carts / cart_items ----------
drop policy if exists carts_own on carts;
create policy carts_own on carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cart_items_own on cart_items;
create policy cart_items_own on cart_items
  for all using (
    exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
  );

-- ---------- orders / order_items ----------
drop policy if exists orders_select on orders;
create policy orders_select on orders
  for select using (auth.uid() = user_id or is_store_staff(store_id));
drop policy if exists orders_staff_write on orders;
create policy orders_staff_write on orders
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

drop policy if exists order_items_select on order_items;
create policy order_items_select on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id
            and (o.user_id = auth.uid() or is_store_staff(o.store_id)))
  );
drop policy if exists order_items_staff_write on order_items;
create policy order_items_staff_write on order_items
  for all using (
    exists (select 1 from orders o where o.id = order_items.order_id and is_store_staff(o.store_id))
  ) with check (
    exists (select 1 from orders o where o.id = order_items.order_id and is_store_staff(o.store_id))
  );

-- ---------- menú restaurante ----------
drop policy if exists menu_cat_public_read on menu_categorias;
create policy menu_cat_public_read on menu_categorias
  for select using (activa = true or is_store_staff(store_id));
drop policy if exists menu_cat_staff_write on menu_categorias;
create policy menu_cat_staff_write on menu_categorias
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

drop policy if exists menu_platos_public_read on menu_platos;
create policy menu_platos_public_read on menu_platos
  for select using (disponible = true or is_store_staff(store_id));
drop policy if exists menu_platos_staff_write on menu_platos;
create policy menu_platos_staff_write on menu_platos
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

-- ---------- reservaciones / pedidos_restaurante ----------
drop policy if exists reservaciones_select on reservaciones;
create policy reservaciones_select on reservaciones
  for select using (auth.uid() = user_id or is_store_staff(store_id));
drop policy if exists reservaciones_staff_write on reservaciones;
create policy reservaciones_staff_write on reservaciones
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

drop policy if exists pedidos_rest_select on pedidos_restaurante;
create policy pedidos_rest_select on pedidos_restaurante
  for select using (auth.uid() = user_id or is_store_staff(store_id));
drop policy if exists pedidos_rest_staff_write on pedidos_restaurante;
create policy pedidos_rest_staff_write on pedidos_restaurante
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

-- ---------- pagos_verificacion ----------
drop policy if exists pagos_verif_staff on pagos_verificacion;
create policy pagos_verif_staff on pagos_verificacion
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

-- ---------- conversaciones_bot ----------
drop policy if exists conv_bot_staff on conversaciones_bot;
create policy conv_bot_staff on conversaciones_bot
  for all using (is_store_staff(store_id)) with check (is_store_staff(store_id));

-- ---------- addresses ----------
drop policy if exists addresses_own on addresses;
create policy addresses_own on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
