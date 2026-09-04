import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/store/ProductCard'
import type { Product } from '@ecommerce/core'

export const dynamic = 'force-dynamic'

interface ProductsPageProps {
  searchParams: Promise<{ categoria?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { categoria, q } = await searchParams
  const store = await getStore()
  if (!store) notFound()
  const supabase = createAdminClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order')

  let categoryId: string | null = null
  if (categoria) {
    categoryId = categories?.find((c) => c.slug === categoria)?.id ?? null
  }

  let query = supabase
    .from('products')
    .select('*, category:categories(id, name, slug), variants:product_variants(*)')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (categoryId) query = query.eq('category_id', categoryId)
  if (q)          query = query.ilike('name', `%${q}%`)

  const { data: products } = await query

  const activeCat = categories?.find((c) => c.slug === categoria)
  const title = activeCat?.name ?? (q ? `"${q}"` : 'Todos los productos')

  return (
    <div className="container-px py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="eyebrow mb-2">Catálogo</p>
        <h1 className="heading-lg text-black">{title}</h1>
      </div>

      <div className="flex gap-10">
        {/* Filtro sidebar */}
        <aside className="hidden md:block w-44 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Categorías</p>
          <ul className="space-y-0.5">
            <li>
              <a
                href="/productos"
                className={`block text-sm py-1.5 font-bold uppercase tracking-wide transition-colors ${
                  !categoria
                    ? 'text-black'
                    : 'text-gray-400 hover:text-black'
                }`}
              >
                Todos
              </a>
            </li>
            {categories?.map((cat) => (
              <li key={cat.id}>
                <a
                  href={`/productos?categoria=${cat.slug}`}
                  className={`block text-sm py-1.5 font-bold uppercase tracking-wide transition-colors ${
                    categoria === cat.slug
                      ? 'text-black'
                      : 'text-gray-400 hover:text-black'
                  }`}
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {/* Mobile filter pills */}
          <div className="flex md:hidden gap-2 flex-wrap mb-6">
            <a
              href="/productos"
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                !categoria
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
              }`}
            >
              Todos
            </a>
            {categories?.map((cat) => (
              <a
                key={cat.id}
                href={`/productos?categoria=${cat.slug}`}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                  categoria === cat.slug
                    ? 'bg-black text-white border-black'
                    : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
                }`}
              >
                {cat.name}
              </a>
            ))}
          </div>

          {products && products.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-5 font-medium">{products.length} productos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {(products as unknown as Product[]).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-24 text-center">
              <p className="text-gray-300 text-sm uppercase tracking-widest font-bold">Sin productos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
