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

## n8n — alerta de pago pendiente a Telegram

Cuando alguien sube un comprobante, queda una fila en `pagos_verificacion` con
`estado = 'pendiente'`. Hoy esa cola se revisa entrando a `/admin/pagos` — este
workflow es **opcional**, para que además llegue una alerta a Telegram con botones
Aprobar/Rechazar. El lado de la app ya está listo (endpoint seguro); falta armar el
workflow en n8n (`Desktop\Repositorios\n8n`, `docker compose up -d`, UI en
`http://localhost:5678`).

**1. Trigger — Supabase Database Webhook (más simple que hacer polling desde n8n):**

- Supabase → proyecto MobilSa → **Database → Webhooks → Create a new hook**.
- Tabla: `pagos_verificacion`. Evento: `INSERT`. Tipo: `HTTP Request`.
- URL: la del nodo **Webhook** de n8n (crealo primero en el workflow, método POST,
  copiá la URL que te da n8n y pegala acá).

**2. Nodo Webhook (n8n)** — recibe el payload de Supabase (`record` = la fila nueva de
`pagos_verificacion`: `id`, `store_id`, `referencia_tipo`, `referencia_id`,
`comprobante_url`, `monto_declarado`, `metodo_pago`).

**3. Nodo HTTP Request — traer el `telegram_chat_id_alertas` del negocio:**
`GET {SUPABASE_URL}/rest/v1/store_config?id=eq.{{ $json.record.store_id }}&select=name,telegram_chat_id_alertas`
con header `apikey` / `Authorization: Bearer` = el `service_role` de MobilSa.

**4. Nodo HTTP Request — armar la URL firmada del comprobante** (el bucket es privado):
`POST {SUPABASE_URL}/storage/v1/object/sign/comprobantes/{{ $json.record.comprobante_url }}`
con `{"expiresIn": 3600}` y el mismo header de `service_role`. La respuesta trae
`signedURL` — anteponerle `{SUPABASE_URL}/storage/v1`.

**5. Nodo Telegram — Send Message** al bot de notificaciones
(`@Notificacionesddat_bot`), `chat_id` = el `telegram_chat_id_alertas` del paso 3.
Texto: negocio, tipo de referencia, monto declarado, método de pago, y la imagen
firmada del paso 4 (usar **Send Photo** en vez de **Send Message** si querés que la
foto se vea directo en el chat). Botones inline:
`Aprobar` → `callback_data: aprobar:{{ $json.record.id }}`,
`Rechazar` → `callback_data: rechazar:{{ $json.record.id }}`.

**6. Trigger — Telegram Trigger (`callback_query`)** en el mismo workflow o uno aparte,
escuchando al bot de notificaciones.

**7. Nodo Function/Code** — separar `callback_data` en `accion` (`aprobar`/`rechazar`)
y `pagoId` (todo antes/después de los dos puntos).

**8. Nodo HTTP Request — resolver el pago:**
`POST {NEXT_PUBLIC_SITE_URL}/api/pagos-verificacion/{{ $json.pagoId }}`
Header: `Authorization: Bearer {N8N_SHARED_SECRET}` (mismo valor que
`N8N_SHARED_SECRET` en `apps/web/.env.local` / las env vars del deploy).
Body: `{"accion": "{{ $json.accion }}"}`.
Esto ya actualiza `pagos_verificacion` **y** cascada el estado a `orders` /
`pedidos_restaurante` / `reservaciones` — es la misma función que usa el botón
Aprobar/Rechazar de `/admin/pagos`.

**9. Nodo Telegram — Answer Callback Query + editar el mensaje** para mostrar
"✅ Aprobado" / "❌ Rechazado" y sacar los botones.

## Cómo se mapea al plan

| Plan (`saasmultinegocioplan.md` §9) | Tabla real |
|---|---|
| `negocios` | `store_config` (+ `tipo_servicio`, `estado`, `punto_mi_vecino_codigo`, `telegram_chat_id_alertas`) |
| `usuarios_negocio` | `profiles.store_id` + `profiles.role` |
| `pedidos_tienda` | `orders` (+ `channel`, `comprobante_url`, `customer_*`) |
| `pagos_verificacion` | igual |
| `menu_categorias`, `menu_platos`, `reservaciones`, `pedidos_restaurante` | igual |
| `conversaciones_bot` | igual |
