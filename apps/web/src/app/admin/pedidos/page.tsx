import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { RestauranteOrdersView } from '@/components/admin/RestauranteOrdersView'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  pending_payment: { label: 'Esperando pago', variant: 'warning' },
  pending:    { label: 'Pendiente',    variant: 'warning' },
  paid:       { label: 'Pagado',       variant: 'success' },
  processing: { label: 'Procesando',  variant: 'default' },
  shipped:    { label: 'Enviado',      variant: 'default' },
  delivered:  { label: 'Entregado',   variant: 'success' },
  cancelled:  { label: 'Cancelado',   variant: 'error' },
  refunded:   { label: 'Reembolsado', variant: 'error' },
}

interface OrdersPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function OrdersAdminPage({ searchParams }: OrdersPageProps) {
  const { status } = await searchParams
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  if (store.tipo_servicio === 'restaurante') {
    const [{ data: pedidos }, { data: reservas }] = await Promise.all([
      supabase.from('pedidos_restaurante').select('*').eq('store_id', store.id).order('created_at', { ascending: false }),
      supabase.from('reservaciones').select('*').eq('store_id', store.id).order('created_at', { ascending: false }),
    ])
    return (
      <RestauranteOrdersView
        pedidos={pedidos ?? []}
        reservas={reservas ?? []}
        currency={store.currency}
      />
    )
  }

  let query = supabase
    .from('orders')
    .select('*, profiles(full_name, phone)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: orders } = await query

  const statuses = Object.keys(STATUS_MAP)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-500">{orders?.length ?? 0} resultados</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Link href="/admin/pedidos"
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors
            ${!status ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
          Todos
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/pedidos?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors
              ${status === s ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
            {STATUS_MAP[s].label}
          </Link>
        ))}
      </div>

      {(!orders || orders.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No hay pedidos{status ? ` con estado "${STATUS_MAP[status]?.label}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order: any) => (
                <Link key={order.id} href={`/admin/pedidos/${order.id}`} legacyBehavior>
                  <tr className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{order.profiles?.full_name ?? 'Sin nombre'}</p>
                      {order.profiles?.phone && (
                        <p className="text-xs text-gray-400">{order.profiles.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_MAP[order.status]?.variant ?? 'default'}>
                        {STATUS_MAP[order.status]?.label ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatPrice(order.total, store.currency)}
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
