-- ============================================================
-- POLÍTICAS RLS PARA ADMIN
-- ============================================================

-- Los admins pueden leer y modificar todo en su tienda
-- (usamos service_role desde el backend, pero estas policies sirven
--  si alguna query se hace con el anon key del admin logueado)

create policy "admin_products_all" on products for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('store_admin', 'super_admin')
    )
  );

create policy "admin_categories_all" on categories for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('store_admin', 'super_admin')
    )
  );

create policy "admin_orders_all" on orders for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('store_admin', 'super_admin')
    )
  );

create policy "admin_order_items_all" on order_items for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('store_admin', 'super_admin')
    )
  );

create policy "admin_profiles_read" on profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p2
      where p2.id = auth.uid()
      and p2.role in ('store_admin', 'super_admin')
    )
  );

-- ============================================================
-- DATOS INICIALES: tienda demo
-- ============================================================

insert into store_config (slug, name, primary_color, secondary_color, currency, country)
values ('ropa-demo', 'Mi Tienda de Ropa', '#1a1a2e', '#e94560', 'USD', 'EC')
on conflict (slug) do nothing;

-- ============================================================
-- CATEGORÍAS DE EJEMPLO
-- ============================================================
-- Ejecutar después de insertar la tienda:
-- insert into categories (store_id, name, slug, sort_order)
-- select id, 'Camisetas', 'camisetas', 1 from store_config where slug = 'ropa-demo'
-- union all
-- select id, 'Pantalones', 'pantalones', 2 from store_config where slug = 'ropa-demo'
-- union all
-- select id, 'Vestidos', 'vestidos', 3 from store_config where slug = 'ropa-demo'
-- union all
-- select id, 'Accesorios', 'accesorios', 4 from store_config where slug = 'ropa-demo';
