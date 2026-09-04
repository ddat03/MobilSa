'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_STORE_COOKIE } from '@/lib/store'
import { slugify } from '@/lib/utils'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') throw new Error('Sin permiso')
  return admin
}

export async function crearNegocio(formData: FormData) {
  const admin = await assertSuperAdmin()

  const name          = (formData.get('name') as string)?.trim()
  const slugRaw       = (formData.get('slug') as string)?.trim()
  const tipo_servicio = (formData.get('tipo_servicio') as string) || 'tienda'
  const primary_color   = (formData.get('primary_color') as string) || '#1E3A5F'
  const secondary_color = (formData.get('secondary_color') as string) || '#e94560'
  const currency = (formData.get('currency') as string) || 'USD'
  const telegram_chat_id_alertas = (formData.get('telegram_chat_id_alertas') as string)?.trim() || null

  if (!name) throw new Error('El nombre es obligatorio')
  const slug = slugify(slugRaw || name)
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Subdominio inválido')
  if (!['tienda', 'restaurante'].includes(tipo_servicio)) throw new Error('Tipo de servicio inválido')

  const { error } = await admin.from('store_config').insert({
    name, slug, tipo_servicio, estado: 'prueba',
    primary_color, secondary_color, currency, country: 'EC',
    telegram_chat_id_alertas,
  })

  if (error) {
    if (error.code === '23505') throw new Error(`El subdominio "${slug}" ya está en uso`)
    throw new Error(error.message)
  }

  revalidatePath('/superadmin')
  redirect('/superadmin')
}

export async function cambiarEstado(formData: FormData) {
  const admin = await assertSuperAdmin()
  const id = formData.get('id') as string
  const estado = formData.get('estado') as string
  if (!['prueba', 'activo', 'suspendido'].includes(estado)) throw new Error('Estado inválido')
  await admin.from('store_config').update({ estado }).eq('id', id)
  revalidatePath('/superadmin')
}

export async function administrarNegocio(formData: FormData) {
  await assertSuperAdmin()
  const slug = formData.get('slug') as string
  ;(await cookies()).set(ADMIN_STORE_COOKIE, slug, { httpOnly: true, sameSite: 'lax', path: '/' })
  redirect('/admin')
}
