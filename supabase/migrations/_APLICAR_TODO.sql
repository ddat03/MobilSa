-- ============================================================
-- MobilSa · schema completo (001+002+003+004 concatenados)
-- Pegar TODO esto en Supabase > SQL Editor > New query > Run
-- Generado 2026-09-04. Fuente: archivos 00X_*.sql de esta carpeta.
-- ============================================================

-- ============================================================
-- MobilSa · SaaS multi-negocio (tienda + restaurante)
-- 001 — Schema completo
-- Proyecto Supabase: MobilSa (ectlzwbvrouewbaivfdl)
-- Reemplaza y reconcilia las migraciones 001–006 del proyecto de ropa
-- (archivadas en supabase/migrations/_legacy_ropa/).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- NEGOCIOS (tenants) — tabla `store_config`
-- El plan la llama `negocios`; se mantiene el nombre `store_config`
-- para no romper el código existente de la tienda.
-- ============================================================
create table if not exists store_config (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,               -- subdominio: <slug>.miplataforma.com
  name          text not null,
  tipo_servicio text not null default 'tienda' check (tipo_servicio in ('tienda','restaurante')),
  estado        text not null default 'prueba'  check (estado in ('prueba','activo','suspendido')),
  active        boolean default true,               -- se mantiene por compatibilidad; espejo de estado='activo'

  -- Identidad visual (white-label)
  logo_url        text,
  primary_color   text default '#1E3A5F',
  secondary_color text default '#e94560',
  accent_color    text default '#f5a623',
  tagline         text,

  -- Negocio
  currency  text default 'USD',
  country   text default 'EC',

  -- Contacto / redes
  whatsapp_number text,
  instagram_url   text,
  tiktok_url      text,

  -- Cobro manual: transferencia Banco Pichincha
  bank_name    text,
  bank_account text,
  bank_holder  text,
  bank_id      text,

  -- Cobro manual: De Una (Pichincha)
  deuna_qr_url text,
  deuna_phone  text,

  -- Cobro manual: punto Mi Vecino (Pichincha)
  punto_mi_vecino_codigo text,

  -- Alertas de verificación de pago
  telegram_chat_id_alertas text,

  -- Envío (tienda / restaurante domicilio)
  shipping_flat_rate numeric(10,2),

  created_at timestamptz default now()
);

comment on table store_config is 'Un registro por negocio/cliente (tenant). El plan lo llama `negocios`.';

-- Mantener `active` sincronizado con `estado`
create or replace function sync_store_active()
returns trigger language plpgsql as $$
begin
  new.active := (new.estado = 'activo');
  return new;
end;
$$;
drop trigger if exists store_config_sync_active on store_config;
create trigger store_config_sync_active
  before insert or update on store_config
  for each row execute function sync_store_active();

-- ============================================================
-- PERFILES DE USUARIO
-- El plan usa `usuarios_negocio`; acá se resuelve con profiles.store_id
-- (decisión II.8.3: un dueño = un negocio).
-- ============================================================
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  store_id   uuid references store_config(id) on delete set null,
  full_name  text,
  phone      text,
  avatar_url text,
  role       text not null default 'customer' check (role in ('super_admin','store_admin','customer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helpers para RLS (security definer: evitan recursión sobre profiles)
-- ============================================================
create or replace function public.current_store_id()
returns uuid language sql stable security definer set search_path = public as $$
  select store_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  )
$$;

create or replace function public.is_store_staff(target_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'store_admin' and store_id = target_store
  )
$$;

-- ============================================================
-- CATÁLOGO (módulo tienda)
-- ============================================================
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references store_config(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  image_url   text,
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  unique (store_id, slug)
);

create table if not exists products (
  id               uuid primary key default uuid_generate_v4(),
  store_id         uuid not null references store_config(id) on delete cascade,
  category_id      uuid references categories(id) on delete set null,
  name             text not null,
  slug             text not null,
  description      text,
  price            numeric(10,2) not null,
  compare_at_price numeric(10,2),
  images           text[] default '{}',
  tags             text[] default '{}',
  active           boolean default true,
  featured         boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (store_id, slug)
);

create table if not exists product_variants (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  sku        text,
  color      text,
  size       text,
  price      numeric(10,2),
  stock      int not null default 0,
  active     boolean default true
);

-- ============================================================
-- CARRITO
-- ============================================================
create table if not exists carts (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid not null references store_config(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  session_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cart_items (
  id         uuid primary key default uuid_generate_v4(),
  cart_id    uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  quantity   int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- PEDIDOS (módulo tienda) — el plan lo llama `pedidos_tienda`
-- `status` es text + CHECK (no enum) para poder extenderlo sin migración de tipo.
-- ============================================================
create table if not exists orders (
  id               uuid primary key default uuid_generate_v4(),
  store_id         uuid not null references store_config(id),
  user_id          uuid references profiles(id),
  order_number     text unique not null,
  status           text not null default 'pending_payment' check (status in (
                     'pending','pending_payment','pago_en_revision','paid',
                     'processing','shipped','delivered','cancelled','refunded')),
  channel          text not null default 'web' check (channel in ('web','telegram','whatsapp')),
  subtotal         numeric(10,2) not null,
  shipping_cost    numeric(10,2) default 0,
  discount         numeric(10,2) default 0,
  total            numeric(10,2) not null,
  currency         text default 'USD',
  shipping_address jsonb,
  -- Datos del cliente (para invitados / canal bot, cuando no hay user_id)
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  -- Pago
  payment_method   text,                 -- 'stripe' | 'deuna' | 'transfer' | 'mi_vecino'
  payment_id       text,
  comprobante_url  text,                  -- foto del comprobante (pago manual)
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  variant_id   uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_info text,
  sku          text,
  quantity     int not null,
  unit_price   numeric(10,2) not null,
  total_price  numeric(10,2) not null
);

-- ============================================================
-- MÓDULO RESTAURANTE
-- ============================================================
create table if not exists menu_categorias (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid not null references store_config(id) on delete cascade,
  nombre     text not null,
  orden      int default 0,
  activa     boolean default true,
  created_at timestamptz default now()
);

create table if not exists menu_platos (
  id           uuid primary key default uuid_generate_v4(),
  store_id     uuid not null references store_config(id) on delete cascade,
  categoria_id uuid references menu_categorias(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  precio       numeric(10,2) not null,
  foto_url     text,
  disponible   boolean default true,
  orden        int default 0,
  created_at   timestamptz default now()
);

create table if not exists reservaciones (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid not null references store_config(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  cliente_nombre  text not null,
  cliente_telefono text,
  fecha           date not null,
  hora            time not null,
  numero_personas int not null check (numero_personas > 0),
  anticipo_monto  numeric(10,2) not null default 0,
  metodo_pago     text,
  comprobante_url text,
  estado          text not null default 'pendiente_pago' check (estado in (
                    'pendiente_pago','pago_en_revision','confirmada','cancelada','completada')),
  canal           text not null default 'web' check (canal in ('web','telegram','whatsapp')),
  notas           text,
  created_at      timestamptz default now()
);

create table if not exists pedidos_restaurante (
  id               uuid primary key default uuid_generate_v4(),
  store_id         uuid not null references store_config(id) on delete cascade,
  user_id          uuid references profiles(id) on delete set null,
  modalidad        text not null check (modalidad in ('recoger','domicilio')),
  cliente_nombre   text not null,
  cliente_telefono text,
  items            jsonb not null default '[]',
  hora_estimada    text,
  direccion_envio  jsonb,
  costo_envio      numeric(10,2) default 0,
  subtotal         numeric(10,2) not null default 0,
  total            numeric(10,2) not null,
  metodo_pago      text,
  comprobante_url  text,
  estado           text not null default 'pendiente_pago' check (estado in (
                     'pendiente_pago','pago_en_revision','pagado','preparando',
                     'listo_o_en_camino','entregado','cancelado')),
  canal            text not null default 'web' check (canal in ('web','telegram','whatsapp')),
  notas            text,
  created_at       timestamptz default now()
);

-- ============================================================
-- COLA DE VERIFICACIÓN DE PAGOS (compartida entre módulos)
-- ============================================================
create table if not exists pagos_verificacion (
  id             uuid primary key default uuid_generate_v4(),
  store_id       uuid not null references store_config(id) on delete cascade,
  referencia_tipo text not null check (referencia_tipo in (
                    'pedido_tienda','pedido_restaurante','reservacion')),
  referencia_id  uuid not null,
  comprobante_url text not null,
  monto_declarado numeric(10,2),
  metodo_pago    text,
  estado         text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  revisado_por   uuid references profiles(id) on delete set null,
  fecha_revision timestamptz,
  notas          text,
  created_at     timestamptz default now()
);

-- ============================================================
-- ESTADO DE CONVERSACIONES DEL ASISTENTE (Telegram / WhatsApp)
-- ============================================================
create table if not exists conversaciones_bot (
  id                uuid primary key default uuid_generate_v4(),
  store_id          uuid not null references store_config(id) on delete cascade,
  canal             text not null check (canal in ('telegram','whatsapp')),
  canal_user_id     text not null,
  estado_flujo      jsonb default '{}',
  ultima_interaccion timestamptz default now(),
  created_at        timestamptz default now(),
  unique (canal, canal_user_id)
);

-- ============================================================
-- ADDRESSES (libreta de direcciones del cliente)
-- ============================================================
create table if not exists addresses (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  alias       text default 'Casa',
  full_name   text not null,
  phone       text,
  street      text not null,
  city        text not null,
  province    text,
  postal_code text,
  country     text default 'EC',
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_products_store_active   on products(store_id, active);
create index if not exists idx_products_category        on products(category_id);
create index if not exists idx_variants_product         on product_variants(product_id);
create index if not exists idx_categories_store         on categories(store_id, active);
create index if not exists idx_orders_store_status      on orders(store_id, status);
create index if not exists idx_orders_user              on orders(user_id);
create index if not exists idx_order_items_order        on order_items(order_id);
create index if not exists idx_menu_platos_store        on menu_platos(store_id, disponible);
create index if not exists idx_menu_categorias_store    on menu_categorias(store_id);
create index if not exists idx_reservaciones_store      on reservaciones(store_id, estado);
create index if not exists idx_pedidos_rest_store       on pedidos_restaurante(store_id, estado);
create index if not exists idx_pagos_verif_store_estado on pagos_verificacion(store_id, estado);
create index if not exists idx_pagos_verif_ref          on pagos_verificacion(referencia_tipo, referencia_id);
create index if not exists idx_conv_bot_lookup          on conversaciones_bot(canal, canal_user_id);

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

-- ============================================================
-- MobilSa · 003 — Storage buckets y políticas
-- Correr DESPUÉS de 001/002.
-- ============================================================

-- Bucket público: imágenes de productos, platos, logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880,
        array['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Bucket PRIVADO: comprobantes de pago (no deben ser públicos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['image/jpeg','image/jpg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------- products (público) ----------
drop policy if exists products_bucket_public_read on storage.objects;
create policy products_bucket_public_read on storage.objects
  for select to public using (bucket_id = 'products');

drop policy if exists products_bucket_staff_write on storage.objects;
create policy products_bucket_staff_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'products'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

drop policy if exists products_bucket_staff_delete on storage.objects;
create policy products_bucket_staff_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'products'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

-- ---------- comprobantes (privado) ----------
-- Subida: cualquiera autenticado puede subir su comprobante.
-- La subida pública (invitado / bot) se hace desde rutas API con service_role.
drop policy if exists comprobantes_upload on storage.objects;
create policy comprobantes_upload on storage.objects
  for insert to authenticated with check (bucket_id = 'comprobantes');

-- Lectura: solo staff (revisan la cola). El super_admin incluido vía role.
drop policy if exists comprobantes_staff_read on storage.objects;
create policy comprobantes_staff_read on storage.objects
  for select to authenticated using (
    bucket_id = 'comprobantes'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

-- Nota: para mostrar el comprobante en el panel se usan signed URLs generadas
-- con service_role (createAdminClient), no acceso público.

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
