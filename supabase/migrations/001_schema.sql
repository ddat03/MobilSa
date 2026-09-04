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
