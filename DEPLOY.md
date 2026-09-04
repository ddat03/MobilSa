# Deploy a producción — subdominios reales por negocio

Estado actual (2026-09-05): **sin dominio propio todavía.** Localmente el negocio
activo se resuelve por `NEXT_PUBLIC_STORE_SLUG` (ver `apps/web/.env.local`). Esta guía
es la receta para cuando haya un dominio — no depende de nada más que ya no esté
hecho: el código que resuelve el negocio por subdominio (`apps/web/src/middleware.ts`
+ `src/lib/store.ts` → `slugFromHost()`) ya está escrito y probado.

## 1. Cuenta de Vercel

Vercel es la recomendada porque es quien hace Next.js: soporta dominios wildcard
(`*.tudominio.com`) con SSL automático, sin configurar nada aparte. Crear cuenta
gratis en [vercel.com](https://vercel.com) (podés entrar con la cuenta de GitHub
`ddat03`, así conecta directo con el repo `ddat03/MobilSa`).

## 2. Importar el proyecto

1. Vercel → **Add New → Project** → elegir `ddat03/MobilSa`.
2. **Root Directory:** `apps/web` (el repo es un monorepo — Vercel necesita saber
   dónde está el Next.js).
3. **Framework Preset:** Next.js (lo detecta solo).
4. **Environment Variables** — cargar las mismas de `apps/web/.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `N8N_SHARED_SECRET`. **No** cargues `NEXT_PUBLIC_STORE_SLUG` en producción una vez
   que haya subdominios reales — esa variable es sólo el fallback para cuando no hay
   `Host` que resolver (local, o un deploy dedicado de un solo negocio — Camino B del
   plan).
5. Deploy. Va a quedar accesible en `<algo>.vercel.app` — ese dominio **no sirve**
   para probar subdominios de negocio (`slugFromHost()` lo excluye a propósito, para
   no confundir un preview de Vercel con un negocio real).

## 3. Comprar el dominio

Cualquier registrador sirve (Namecheap, Cloudflare Registrar, Google Domains). Recomendación:
**Cloudflare Registrar** — vende al costo (sin markup) y además te deja usar su DNS
gratis, que tiene buenas herramientas si más adelante se quiere proteger el sitio con
Cloudflare (WAF, cache) sin mover nada.

## 4. Conectar el dominio a Vercel

1. Vercel → proyecto → **Settings → Domains → Add**.
2. Agregar el dominio raíz (`tudominio.com`) — Vercel te da los registros DNS exactos
   (normalmente un `A` o `ALIAS`/`CNAME` apuntando a Vercel).
3. Agregar además **`*.tudominio.com`** (wildcard) en la misma pantalla — Vercel pide
   un registro `CNAME` tipo `*.tudominio.com → cname.vercel-dns.com.` (el valor exacto
   te lo muestra Vercel al agregarlo).
4. Cargar esos registros en el DNS del dominio (en el registrador, o en Cloudflare si
   usaste su DNS). Tarda de minutos a un par de horas en propagar.
5. Vercel emite el certificado SSL wildcard solo, no hay que hacer nada más.

## 5. Verificar

- `https://tudominio.com` → debería resolver como si no hubiera subdominio (usa el
  fallback `NEXT_PUBLIC_STORE_SLUG`, o mostrar un landing propio de la plataforma —
  ver la pregunta abierta en `saasmultinegocioplan.md` sobre esa página).
- `https://ropa-demo.tudominio.com` (o el slug que corresponda) → debería mostrar
  la tienda de ese negocio. Confirmalo mirando la Network tab: el middleware debería
  estar mandando `x-store-slug: ropa-demo` (se puede loguear temporalmente en
  `apps/web/src/middleware.ts` para verificar en los logs de Vercel).

## 6. Al crear cada negocio nuevo

No hace falta tocar DNS por cada negocio — el wildcard ya cubre cualquier slug. Sólo
hay que crearlo desde `/superadmin` con el slug que va a ser su subdominio.

## Alternativas a Vercel (por si cambia la decisión)

- **Netlify** — soporta wildcard domains también, config similar.
- **VPS propio** (Coolify, ver nota en el `CLAUDE.md` global sobre Oracle Cloud Free) —
  más trabajo (nginx/Caddy con wildcard cert vía Let's Encrypt DNS-01, ya que el
  challenge HTTP-01 no sirve para wildcard), pero sin costo mensual de hosting.

---

Creado por Diego Aleman
