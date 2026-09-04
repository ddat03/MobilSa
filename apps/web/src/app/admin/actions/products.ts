'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { slugify } from '@/lib/utils'

export async function crearCategoria(nombre: string): Promise<{ id: string; name: string } | { error: string }> {
  const name = nombre.trim()
  if (!name) return { error: 'Nombre vacío' }
  const store = await requireAdminStore()
  const supabase = createAdminClient()
  const slug = slugify(name)

  const { data, error } = await supabase
    .from('categories')
    .insert({ store_id: store.id, name, slug, active: true })
    .select('id, name')
    .single()

  if (error || !data) {
    if (error?.code === '23505') return { error: 'Ya existe una categoría con ese nombre' }
    return { error: error?.message ?? 'No se pudo crear' }
  }
  revalidatePath('/admin/productos')
  return { id: data.id, name: data.name }
}

export async function toggleProductActive(formData: FormData) {
  const id = formData.get('id') as string
  const active = formData.get('active') === 'true'
  const store = await requireAdminStore()
  const supabase = createAdminClient()
  await supabase.from('products').update({ active }).eq('id', id).eq('store_id', store.id)
  revalidatePath('/admin/productos')
}

// Retorna { productId } en vez de redirect — el cliente maneja la navegación
export async function createProduct(formData: FormData) {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const name        = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const price       = parseFloat(formData.get('price') as string)
  const cmp         = formData.get('compare_at_price') as string
  const compare_at_price = cmp && cmp !== '' ? parseFloat(cmp) : null
  const category_id = (formData.get('category_id') as string) || null
  const featured    = formData.get('featured') === 'on'
  const store_id    = store.id
  const tagsRaw     = (formData.get('tags') as string) || ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const variantsRaw = formData.get('variants') as string
  const variants    = variantsRaw ? JSON.parse(variantsRaw) : []
  const slug        = slugify(name)

  if (!store_id) throw new Error('store_id requerido — verifica que la tienda esté configurada')
  if (!name)     throw new Error('El nombre del producto es requerido')
  if (isNaN(price)) throw new Error('El precio debe ser un número válido')

  const { data: product, error } = await supabase
    .from('products')
    .insert({ name, description, price, compare_at_price, category_id, featured, tags, store_id, slug, active: true })
    .select('id')
    .single()

  if (error || !product) {
    throw new Error(error?.message ?? 'Error al guardar en la base de datos')
  }

  if (variants.length > 0) {
    await supabase.from('product_variants').insert(
      variants.map((v: any) => ({
        product_id: product.id,
        color: v.color || null,
        size:  v.size  || null,
        sku:   v.sku   || null,
        price: v.price ? parseFloat(v.price) : null,
        stock: parseInt(v.stock) || 0,
        active: true,
      }))
    )
  } else {
    await supabase.from('product_variants').insert({ product_id: product.id, stock: 0 })
  }

  revalidatePath('/admin/productos')
  revalidatePath('/')
  return { productId: product.id }
}

export async function updateProduct(formData: FormData) {
  const store = await requireAdminStore()
  const supabase = createAdminClient()
  const id          = formData.get('id') as string
  const name        = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const price       = parseFloat(formData.get('price') as string)
  const cmp         = formData.get('compare_at_price') as string
  const compare_at_price = cmp && cmp !== '' ? parseFloat(cmp) : null
  const category_id = (formData.get('category_id') as string) || null
  const featured    = formData.get('featured') === 'on'
  const tagsRaw     = (formData.get('tags') as string) || ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)

  const { error } = await supabase
    .from('products')
    .update({ name, description, price, compare_at_price, category_id, featured, tags, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('store_id', store.id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/productos')
  revalidatePath(`/admin/productos/${id}`)
  revalidatePath('/productos')
  return { success: true }
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get('id') as string
  const store = await requireAdminStore()
  const supabase = createAdminClient()
  await supabase.from('products').delete().eq('id', id).eq('store_id', store.id)
  revalidatePath('/admin/productos')
  redirect('/admin/productos')
}

export async function updateVariantStock(formData: FormData) {
  const variantId = formData.get('variant_id') as string
  const stock     = parseInt(formData.get('stock') as string)
  const store     = await requireAdminStore()
  const supabase  = createAdminClient()

  // Verificar que la variante pertenezca a un producto de este negocio
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, products!inner(store_id)')
    .eq('id', variantId)
    .maybeSingle()
  if (!variant || (variant as any).products?.store_id !== store.id) return

  await supabase.from('product_variants').update({ stock }).eq('id', variantId)
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/productos')
}

export async function uploadProductImage(formData: FormData) {
  const file      = formData.get('file') as File
  const productId = formData.get('product_id') as string

  if (!file || file.size === 0) return { error: 'No se seleccionó imagen', url: null }

  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const { data: owned } = await supabase
    .from('products').select('id').eq('id', productId).eq('store_id', store.id).maybeSingle()
  if (!owned) return { error: 'Producto no encontrado', url: null }
  const ext  = file.name.split('.').pop()
  const path = `${productId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message, url: null }

  const { data } = supabase.storage.from('products').getPublicUrl(path)

  const { data: existing } = await supabase
    .from('products').select('images').eq('id', productId).single()

  await supabase
    .from('products')
    .update({ images: [...(existing?.images ?? []), data.publicUrl] })
    .eq('id', productId)

  revalidatePath(`/admin/productos/${productId}`)
  return { url: data.publicUrl, error: null }
}
