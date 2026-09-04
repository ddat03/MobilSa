# Base de datos — proyecto MobilSa

Proyecto Supabase: **MobilSa** (`ectlzwbvrouewbaivfdl`), cuenta `diegodaviaus@hotmail.com`.
Dedicado al SaaS multi-negocio. Ver `../saasmultinegocioplan.md` (Parte II).

## Aplicar el schema (primera vez)

**Opción rápida (sin CLI ni contraseña):**

1. Supabase → proyecto MobilSa → **SQL Editor** → **New query**.
2. Pegar el contenido completo de [`migrations/_APLICAR_TODO.sql`](migrations/_APLICAR_TODO.sql).
3. **Run**. Debería terminar sin errores (usa `if not exists` / `on conflict`, es re-ejecutable).

**Opción CLI (si preferís):**

```bash
npx supabase link --project-ref ectlzwbvrouewbaivfdl   # pide la contraseña de la BD
npx supabase db push
```
(requiere renombrar los `.sql` al formato `<timestamp>_nombre.sql` que espera el CLI).

## Después de aplicar

1. Registrate en la app (`/registro`) con tu email.
2. En el SQL Editor, promové tu usuario a super_admin:
   ```sql
   update profiles set role = 'super_admin'
   where id = (select id from auth.users where email = 'TU_EMAIL');
   ```
3. Cargá el `SUPABASE_SERVICE_ROLE_KEY` en `apps/web/.env.local` (ya está).

## Archivos

| Archivo | Qué hace |
|---|---|
| `migrations/001_schema.sql` | Todas las tablas + funciones helper + índices |
| `migrations/002_rls.sql` | Row Level Security, aislamiento por `store_id` |
| `migrations/003_storage.sql` | Buckets `products` (público) y `comprobantes` (privado) |
| `migrations/004_seed.sql` | Negocio #1 `ropa-demo` + categorías demo |
| `migrations/_APLICAR_TODO.sql` | Los 4 anteriores concatenados, para pegar de una |
| `migrations/_legacy_ropa/` | Migraciones viejas del proyecto de ropa individual (solo historial) |

## Cómo se mapea al plan

| Plan (`saasmultinegocioplan.md` §9) | Tabla real |
|---|---|
| `negocios` | `store_config` (+ `tipo_servicio`, `estado`, `punto_mi_vecino_codigo`, `telegram_chat_id_alertas`) |
| `usuarios_negocio` | `profiles.store_id` + `profiles.role` |
| `pedidos_tienda` | `orders` (+ `channel`, `comprobante_url`, `customer_*`) |
| `pagos_verificacion` | igual |
| `menu_categorias`, `menu_platos`, `reservaciones`, `pedidos_restaurante` | igual |
| `conversaciones_bot` | igual |
