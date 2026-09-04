'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'

/* ─────────────  CATEGORÍAS DEL MENÚ  ───────────── */

export async function crearCategoriaMenu(formData: FormData) {
  const store = await requireAdminStore()
  const nombre = (formData.get('nombre') as string)?.trim()
  if (!nombre) throw new Error('El nombre de la categoría es obligatorio')

  const supabase = createAdminClient()
  const { count } = await supabase
    .from('menu_categorias')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)

  const { error } = await supabase.from('menu_categorias').insert({
    store_id: store.id,
    nombre,
    orden: count ?? 0,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

export async function renombrarCategoriaMenu(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  if (!nombre) throw new Error('Nombre obligatorio')

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('menu_categorias')
    .update({ nombre })
    .eq('id', id)
    .eq('store_id', store.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

export async function eliminarCategoriaMenu(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const supabase = createAdminClient()
  // Los platos quedan sin categoría (on delete set null)
  const { error } = await supabase
    .from('menu_categorias')
    .delete()
    .eq('id', id)
    .eq('store_id', store.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

/* ─────────────  PLATOS  ───────────── */

export async function guardarPlato(formData: FormData) {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const id           = (formData.get('id') as string) || null
  const nombre       = (formData.get('nombre') as string)?.trim()
  const descripcion  = (formData.get('descripcion') as string)?.trim() || null
  const precioRaw    = formData.get('precio') as string
  const categoria_id = (formData.get('categoria_id') as string) || null
  const foto_url     = (formData.get('foto_url') as string)?.trim() || null
  const disponible   = formData.get('disponible') === 'on'

  if (!nombre) throw new Error('El nombre del plato es obligatorio')
  const precio = parseFloat(precioRaw)
  if (isNaN(precio) || precio < 0) throw new Error('Precio inválido')

  if (id) {
    const { error } = await supabase
      .from('menu_platos')
      .update({ nombre, descripcion, precio, categoria_id, foto_url, disponible })
      .eq('id', id)
      .eq('store_id', store.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('menu_platos').insert({
      store_id: store.id, nombre, descripcion, precio, categoria_id, foto_url, disponible,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/menu')
}

export async function eliminarPlato(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('menu_platos')
    .delete()
    .eq('id', id)
    .eq('store_id', store.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/menu')
}

export async function toggleDisponiblePlato(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const disponible = formData.get('disponible') === 'true'
  const supabase = createAdminClient()
  await supabase
    .from('menu_platos')
    .update({ disponible })
    .eq('id', id)
    .eq('store_id', store.id)
  revalidatePath('/admin/menu')
}
