# MobilSa

SaaS multi-negocio (tienda + restaurante) para Ecuador. Una sola plataforma que un
administrador (super_admin) usa para activar y personalizar negocios de sus propios
clientes — sin reprogramar nada por cliente nuevo.

El plan completo, las decisiones de arquitectura y el estado real de cada pieza están
en **[`saasmultinegocioplan.md`](./saasmultinegocioplan.md)** — léelo antes de tocar
código, especialmente la **Parte II**, que es la versión aterrizada contra este repo
(no la visión original).

## Estructura

Monorepo pnpm:

```
apps/
  web/      Next.js 14 (App Router) — sitio público de cada negocio + panel
            /admin (por negocio) + panel /superadmin (todos los negocios)
  bot/      Asistente conversacional (Telegram hoy) — agente Claude con
            tool-calling, separado en core/ (lógica) + channels/ (adapter)
  mobile/   App Expo/React Native de la tienda de ropa original (single-tenant,
            todavía no migrada al modelo multi-negocio)
packages/
  core/     Tipos de dominio compartidos (Negocio, Producto, Pedido, etc.)
  config/   Tipo ClientConfig + defaults white-label (ya no es la fuente de
            verdad del negocio activo — eso lo resuelve apps/web/src/lib/store.ts)
supabase/
  migrations/   Schema de la base (proyecto Supabase "MobilSa")
  README.md     Cómo aplicar el schema
```

## Cómo funciona el multi-tenant

- **`store_config`** es la tabla de negocios (el plan la llama `negocios`): un registro
  por cliente, con su slug, colores, logo, tipo de servicio (`tienda` | `restaurante`)
  y datos de cobro.
- El sitio público de cada negocio se resuelve por **subdominio**
  (`<slug>.tudominio.com`) — ver `apps/web/src/middleware.ts` y `src/lib/store.ts`.
- `/admin` es el panel de un negocio (scopeado a su `store_id`); `/superadmin` es el
  panel del dueño de la plataforma (lista todos los negocios, los crea, los activa).

## Setup local

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # completar con tus credenciales de Supabase
pnpm dev:web      # http://localhost:3000
```

Sin un subdominio real en local, el negocio activo se resuelve por
`NEXT_PUBLIC_STORE_SLUG` en `apps/web/.env.local`. Para pasar a subdominios reales
(`<slug>.tudominio.com`) en producción, ver **[`DEPLOY.md`](./DEPLOY.md)**.

### Base de datos

Ver [`supabase/README.md`](./supabase/README.md) — resumen: pegar
`supabase/migrations/_APLICAR_TODO.sql` en el SQL Editor del proyecto Supabase.

### Bot conversacional

```bash
cd apps/bot
cp .env.example .env   # TELEGRAM_BOT_TOKEN, credenciales de Supabase, ANTHROPIC_API_KEY
pnpm install
pnpm dev
```

## Pagos

No hay pago con tarjeta integrado como flujo principal (poco usado por negocios
chicos en Ecuador). El flujo real es manual: transferencia / De Una / Mi Vecino, el
cliente sube el comprobante (o lo manda por WhatsApp desde el sitio del restaurante) y
un humano lo aprueba desde `/admin/pagos`. Detalle en la Parte I §7 y Parte II del plan.

---

Creado por Diego Aleman
