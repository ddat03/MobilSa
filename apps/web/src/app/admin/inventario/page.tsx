import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { updateVariantStock } from '../actions/products'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, images, variants:product_variants(id, color, size, sku, stock, price)')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('name')

  const allVariants = (products ?? []).flatMap((p: any) =>
    (p.variants ?? []).map((v: any) => ({ ...v, product_name: p.name, product_image: p.images?.[0] }))
  )

  const lowStock = allVariants.filter((v: any) => v.stock <= 5)
  const outOfStock = allVariants.filter((v: any) => v.stock === 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <p className="text-sm text-gray-500">
          {allVariants.length} variantes · <span className="text-red-500">{outOfStock.length} sin stock</span> · <span className="text-yellow-600">{lowStock.length} con stock bajo</span>
        </p>
      </div>

      {/* Alertas */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-red-700 mb-2">Sin stock ({outOfStock.length})</p>
          <div className="flex flex-wrap gap-2">
            {outOfStock.slice(0, 8).map((v: any) => (
              <span key={v.id} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                {v.product_name} {v.color} {v.size}
              </span>
            ))}
            {outOfStock.length > 8 && <span className="text-xs text-red-400">+{outOfStock.length - 8} más</span>}
          </div>
        </div>
      )}

      {/* Tabla de inventario */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variante</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allVariants.map((v: any) => (
              <tr key={v.id} className={v.stock === 0 ? 'bg-red-50/40' : v.stock <= 5 ? 'bg-yellow-50/40' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {v.product_image && (
                      <img src={v.product_image} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                    )}
                    <span className="font-medium text-gray-900">{v.product_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {[v.color, v.size].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.sku || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {v.stock === 0 ? (
                    <Badge variant="error">Sin stock</Badge>
                  ) : v.stock <= 5 ? (
                    <Badge variant="warning">Stock bajo</Badge>
                  ) : (
                    <Badge variant="success">OK</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <form action={updateVariantStock} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="variant_id" value={v.id} />
                    <input
                      type="number"
                      name="stock"
                      defaultValue={v.stock}
                      min="0"
                      className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <button type="submit"
                      className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                      Guardar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
