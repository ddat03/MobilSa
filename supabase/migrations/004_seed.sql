-- ============================================================
-- MobilSa · 004 — Seed inicial
-- Correr DESPUÉS de 001/002/003.
-- ============================================================

-- ---------- Negocio #1: la tienda de ropa (Camino A) ----------
insert into store_config (slug, name, tipo_servicio, estado, primary_color, secondary_color, accent_color, currency, country, tagline)
values ('ropa-demo', 'Mi Tienda de Ropa', 'tienda', 'activo',
        '#1a1a2e', '#e94560', '#f5a623', 'USD', 'EC', 'Moda que te define')
on conflict (slug) do nothing;

insert into categories (store_id, name, slug, sort_order)
select sc.id, c.name, c.slug, c.sort_order
from store_config sc
cross join (values
  ('Camisetas',  'camisetas',  1),
  ('Pantalones', 'pantalones', 2),
  ('Vestidos',   'vestidos',   3),
  ('Accesorios', 'accesorios', 4)
) as c(name, slug, sort_order)
where sc.slug = 'ropa-demo'
on conflict (store_id, slug) do nothing;

-- ---------- Negocio #2: restaurante de prueba (para desarrollo) ----------
-- Descomentar para probar el módulo restaurante en local.
-- insert into store_config (slug, name, tipo_servicio, estado, primary_color, secondary_color, currency, country, tagline)
-- values ('resto-demo', 'Restaurante Demo', 'restaurante', 'prueba',
--         '#2d3436', '#e17055', 'USD', 'EC', 'Comida de verdad')
-- on conflict (slug) do nothing;
--
-- insert into menu_categorias (store_id, nombre, orden)
-- select sc.id, m.nombre, m.orden
-- from store_config sc
-- cross join (values ('Entradas',1),('Platos fuertes',2),('Bebidas',3),('Postres',4)) as m(nombre, orden)
-- where sc.slug = 'resto-demo';

-- ---------- Promover un usuario a super_admin (Diego) ----------
-- Tras registrarte en la app con tu email, corré esto una vez con tu email:
-- update profiles set role = 'super_admin'
-- where id = (select id from auth.users where email = 'TU_EMAIL_AQUI');
