import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function CustomersAdminPage() {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  // Clientes = quienes hicieron al menos un pedido en este negocio
  const { data: storeOrders } = await supabase
    .from('orders')
    .select('user_id')
    .eq('store_id', store.id)
    .not('user_id', 'is', null)

  const counts = new Map<string, number>()
  for (const o of storeOrders ?? []) {
    if (o.user_id) counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1)
  }
  const ids = Array.from(counts.keys())

  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('*').in('id', ids).order('created_at', { ascending: false })
    : { data: [] as any[] }

  const customers = (profiles ?? []).map((c: any) => ({ ...c, orders: [{ count: counts.get(c.id) ?? 0 }] }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500">{customers?.length ?? 0} clientes registrados</p>
      </div>

      {(!customers || customers.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No hay clientes registrados aún.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold">
                        {c.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-medium text-gray-900">{c.full_name ?? 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-700">
                      {c.orders?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('es-EC')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge>{c.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
