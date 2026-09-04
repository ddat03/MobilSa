-- ============================================================
-- ECOMMERCE SAAS - Schema inicial
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- CONFIGURACIÓN WHITE-LABEL DEL NEGOCIO
-- ============================================================
create table store_config (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,          -- identificador del negocio (ej: "ropa-maria")
  name        text not null,
  logo_url    text,
  primary_color   text default '#000000',
  secondary_color text default '#ffffff',
  currency    text default 'USD',
  country     text default 'EC',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- USUARIOS Y PERFILES
-- ============================================================
-- Supabase crea auth.users automáticamente.
-- Esta tabla extiende el perfil público.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  store_id    uuid references store_config(id),
  full_name   text,
  phone       text,
  avatar_url  text,
  role        text not null default 'customer' check (role in ('super_admin', 'store_admin', 'customer')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Trigger: crear perfil automáticamente al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CATÁLOGO DE PRODUCTOS
-- ============================================================
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references store_config(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  image_url   text,
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  unique(store_id, slug)
);

create table products (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references store_config(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name        text not null,
  slug        text not null,
  description text,
  price       numeric(10,2) not null,
  compare_at_price numeric(10,2),          -- precio tachado (antes costaba X)
  images      text[] default '{}',
  tags        text[] default '{}',
  active      boolean default true,
  featured    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(store_id, slug)
);

-- Variantes: cada combinación talla/color tiene su propio stock y precio opcional
create table product_variants (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  sku         text,
  color       text,
  size        text,
  price       numeric(10,2),               -- null = hereda el precio del producto
  stock       int not null default 0,
  active      boolean default true
);

-- ============================================================
-- CARRITO DE COMPRAS
-- ============================================================
create table carts (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references store_config(id),
  user_id     uuid references profiles(id) on delete cascade,
  session_id  text,                        -- para carritos de usuarios no logueados
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table cart_items (
  id          uuid primary key default uuid_generate_v4(),
  cart_id     uuid not null references carts(id) on delete cascade,
  variant_id  uuid not null references product_variants(id),
  quantity    int not null default 1 check (quantity > 0),
  unit_price  numeric(10,2) not null,      -- precio en el momento de añadir al carrito
  created_at  timestamptz default now()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
create type order_status as enum (
  'pending',      -- esperando pago
  'paid',         -- pago confirmado
  'processing',   -- preparando el pedido
  'shipped',      -- enviado
  'delivered',    -- entregado
  'cancelled',    -- cancelado
  'refunded'      -- reembolsado
);

create table orders (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid not null references store_config(id),
  user_id         uuid references profiles(id),
  order_number    text unique not null,    -- número legible (ej: ORD-2024-0001)
  status          order_status default 'pending',
  subtotal        numeric(10,2) not null,
  shipping_cost   numeric(10,2) default 0,
  discount        numeric(10,2) default 0,
  total           numeric(10,2) not null,
  currency        text default 'USD',
  -- Dirección de envío (snapshot al momento del pedido)
  shipping_address jsonb,
  -- Datos de pago
  payment_method  text,
  payment_id      text,                   -- ID de la transacción en Stripe/PayPhone
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  variant_id  uuid references product_variants(id),
  -- Snapshot del producto al momento del pedido
  product_name  text not null,
  variant_info  text,                     -- "Rojo / Talla M"
  sku           text,
  quantity      int not null,
  unit_price    numeric(10,2) not null,
  total_price   numeric(10,2) not null
);

-- Secuencia para números de pedido legibles
create sequence order_number_seq start 1;

create or replace function generate_order_number(store_slug text)
returns text language plpgsql as $$
begin
  return upper(store_slug) || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 4, '0');
end;
$$;

-- ============================================================
-- SUSCRIPCIONES / MEMBRESÍAS
-- ============================================================
create table subscription_plans (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references store_config(id),
  name        text not null,
  description text,
  price       numeric(10,2) not null,
  interval    text not null check (interval in ('monthly', 'yearly')),
  features    jsonb default '[]',
  active      boolean default true
);

create table subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  plan_id           uuid not null references subscription_plans(id),
  status            text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'past_due')),
  payment_provider  text,
  external_id       text,                 -- ID en Stripe/PayPhone
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  cancelled_at      timestamptz,
  created_at        timestamptz default now()
);

-- ============================================================
-- DIRECCIONES DE USUARIO
-- ============================================================
create table addresses (
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table categories enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table addresses enable row level security;
alter table subscriptions enable row level security;

-- Perfiles: cada usuario ve y edita solo el suyo
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Productos: cualquiera puede leer productos activos
create policy "products_public_read" on products for select using (active = true);

-- Variantes: lectura pública
create policy "variants_public_read" on product_variants for select using (active = true);

-- Categorías: lectura pública
create policy "categories_public_read" on categories for select using (active = true);

-- Carritos: usuarios solo ven el suyo
create policy "carts_select_own" on carts for select using (auth.uid() = user_id);
create policy "carts_insert_own" on carts for insert with check (auth.uid() = user_id);
create policy "carts_update_own" on carts for update using (auth.uid() = user_id);
create policy "carts_delete_own" on carts for delete using (auth.uid() = user_id);

create policy "cart_items_select_own" on cart_items for select
  using (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));
create policy "cart_items_insert_own" on cart_items for insert
  with check (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));
create policy "cart_items_update_own" on cart_items for update
  using (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));
create policy "cart_items_delete_own" on cart_items for delete
  using (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));

-- Pedidos: usuarios ven solo los suyos
create policy "orders_select_own" on orders for select using (auth.uid() = user_id);

-- Admins de tienda ven todo (la lógica de is_store_admin la gestiona la app por ahora)
create policy "order_items_select_own" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

-- Direcciones
create policy "addresses_own" on addresses for all using (auth.uid() = user_id);

-- Suscripciones
create policy "subscriptions_own" on subscriptions for select using (auth.uid() = user_id);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
create index on products(store_id, active);
create index on products(category_id);
create index on product_variants(product_id);
create index on orders(store_id, status);
create index on orders(user_id);
create index on cart_items(cart_id);
create index on subscriptions(user_id, status);
