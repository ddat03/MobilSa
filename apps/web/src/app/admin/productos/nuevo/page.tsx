import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { redirect } from 'next/navigation'
import { ProductForm } from '@/components/admin/ProductForm'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const store = await requireAdminStore()
  if (store.tipo_servicio === 'restaurante') redirect('/admin/menu')
  const supabase = createAdminClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, sort_order, store_id')
    .eq('store_id', store.id)
    .order('sort_order')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
        <p className="text-sm text-gray-500">Completa la información del producto</p>
      </div>
      <ProductForm storeId={store.id} categories={categories ?? []} />
    </div>
  )
}
