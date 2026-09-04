import 'server-only'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StoreConfig } from '@ecommerce/core'

// Memoización por request: React.cache no está tipado en @types/react@18,
// así que lo tomamos del runtime (Next lo provee) con fallback a identidad.
function requestCache<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  try {
    const mod = require('react') as { cache?: <T>(f: T) => T }
    if (typeof mod.cache === 'function') return mod.cache(fn)
  } catch { /* noop */ }
  return fn
}

/**
 * Resolución del negocio (tenant) para el request actual.
 *
 * El middleware pone el slug en el header `x-store-slug` a partir del subdominio
 * (`pizzeria-luigi.miplataforma.com` → `pizzeria-luigi`). Para deploys dedicados
 * (Camino B) o desarrollo local se cae a `NEXT_PUBLIC_STORE_SLUG`.
 *
 * TODO(whatsapp/bot): el core del asistente resuelve el negocio por chat_id,
 * no por header — ver saasmultinegocioplan.md §8.
 */

const FALLBACK_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG || 'ropa-demo'

export async function getStoreSlug(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-store-slug')?.trim() || FALLBACK_SLUG
  } catch {
    return FALLBACK_SLUG
  }
}

/** Config completa del negocio actual. Cacheado por request. */
export const getStore = requestCache(async (): Promise<StoreConfig | null> => {
  const slug = await getStoreSlug()
  const admin = createAdminClient()
  const { data } = await admin
    .from('store_config')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return (data as StoreConfig | null) ?? null
})

/** Igual que getStore() pero lanza si el negocio no existe. Para rutas que lo requieren. */
export async function requireStore(): Promise<StoreConfig> {
  const store = await getStore()
  if (!store) throw new Error(`Negocio no encontrado para el slug actual`)
  return store
}

export const ADMIN_STORE_COOKIE = 'sa_store'

export interface AdminContext {
  role: 'super_admin' | 'store_admin' | 'customer'
  store: StoreConfig | null
}

/**
 * Contexto del panel `/admin` para el usuario logueado.
 * Los paneles viven en el dominio raíz, así que NO se resuelven por subdominio:
 *  · `store_admin` → su propio `profile.store_id`.
 *  · `super_admin` → el negocio elegido en `/superadmin` (cookie `sa_store` con el slug);
 *    si no eligió ninguno, `store` es null y el panel muestra un selector.
 */
export const getAdminContext = requestCache(async (): Promise<AdminContext | null> => {
  const admin = createAdminClient()

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('store_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null
  const role = profile.role as AdminContext['role']

  let store: StoreConfig | null = null

  if (role === 'super_admin') {
    const { cookies } = await import('next/headers')
    const slug = (await cookies()).get(ADMIN_STORE_COOKIE)?.value
    if (slug) {
      const { data } = await admin.from('store_config').select('*').eq('slug', slug).maybeSingle()
      store = (data as StoreConfig | null) ?? null
    }
  } else if (profile.store_id) {
    const { data } = await admin.from('store_config').select('*').eq('id', profile.store_id).maybeSingle()
    store = (data as StoreConfig | null) ?? null
  }

  return { role, store }
})

/** El negocio del panel, o null si no hay contexto. Atajo de getAdminContext(). */
export async function getAdminStore(): Promise<StoreConfig | null> {
  return (await getAdminContext())?.store ?? null
}

/** Igual pero lanza si no hay negocio en contexto — para páginas que lo requieren. */
export async function requireAdminStore(): Promise<StoreConfig> {
  const store = await getAdminStore()
  if (!store) throw new Error('No hay negocio seleccionado en el panel')
  return store
}

/** Slug del subdominio a partir de un Host header. Exportado para el middleware. */
export function slugFromHost(host: string | null): string | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()

  // localhost / IP → sin subdominio
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null

  // Soporta subdominio de desarrollo tipo `pizzeria.localhost`
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '') || null
  }

  const parts = hostname.split('.')
  // Necesita al menos sub.dominio.tld
  if (parts.length < 3) return null

  const sub = parts[0]
  if (sub === 'www' || sub === 'app' || sub === 'admin') return null

  // Previews de Vercel (`proyecto-hash.vercel.app`) → no es un negocio
  if (hostname.endsWith('.vercel.app')) return null

  return sub
}
