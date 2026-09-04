import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { ProductForm } from '@/components/admin/ProductForm'
import { notFound } from 'next/navigation'
import { deleteProduct } from '../../actions/products'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const [productRes, categoriesRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, variants:product_variants(*), category:categories(id,name,slug,description,image_url,sort_order,store_id)')
      .eq('id', id)
      .eq('store_id', store.id)
      .maybeSingle(),
    supabase.from('categories').select('id, name, slug, description, image_url, sort_order, store_id').eq('store_id', store.id).order('sort_order'),
  ])

  if (!productRes.data) notFound()

  const product = productRes.data as any

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm"
            className="text-red-500 hover:bg-red-50 hover:text-red-600">
            Eliminar
          </Button>
        </form>
      </div>
      <ProductForm
        product={product}
        storeId={store.id}
        categories={categoriesRes.data ?? []}
      />
    </div>
  )
}
