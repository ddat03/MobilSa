import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Package } from 'lucide-react'
import { toggleProductActive } from '../actions/products'

export const dynamic = 'force-dynamic'

export default async function ProductsAdminPage() {
  const store = await requireAdminStore()
  if (store.tipo_servicio === 'restaurante') redirect('/admin/menu')
  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name), variants:product_variants(stock)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">{products?.length ?? 0} productos en total</p>
        </div>
        <Link href="/admin/productos/nuevo">
          <Button>
            <Plus size={16} className="mr-1.5" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      {(!products || products.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium mb-1">No tienes productos aún</p>
          <p className="text-sm text-gray-400 mb-5">Crea tu primer producto para empezar a vender.</p>
          <Link href="/admin/productos/nuevo">
            <Button>Crear primer producto</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p: any) => {
                const totalStock = (p.variants ?? []).reduce((s: number, v: any) => s + (v.stock ?? 0), 0)
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.featured && <span className="text-xs text-[var(--color-primary)]">Destacado</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatPrice(p.price, store.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={totalStock === 0 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <form action={toggleProductActive}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={String(!p.active)} />
                        <button type="submit">
                          <Badge variant={p.active ? 'success' : 'default'}>
                            {p.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/productos/${p.id}`}>
                        <button className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors">
                          <Pencil size={15} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
