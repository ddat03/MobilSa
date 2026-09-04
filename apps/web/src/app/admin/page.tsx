import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { StatsCard } from '@/components/admin/StatsCard'
import { ShoppingBag, Package, Users, DollarSign } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  // Todas las queries en paralelo, scopeadas al negocio
  const [ordersRes, productsRes, recentOrdersRes] = await Promise.all([
    supabase.from('orders').select('total, status, user_id', { count: 'exact' }).eq('store_id', store.id),
    supabase.from('products').select('id', { count: 'exact' }).eq('store_id', store.id).eq('active', true),
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, profiles(full_name)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const orders = ordersRes.data ?? []
  const customersCount = new Set(orders.map((o) => o.user_id).filter(Boolean)).size
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + Number(o.total), 0)

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'pending_payment').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{store.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Ingresos totales"
          value={formatPrice(totalRevenue, store.currency)}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Pedidos"
          value={ordersRes.count ?? 0}
          subtitle={`${pendingOrders} pendientes`}
          icon={ShoppingBag}
          color="blue"
        />
        <StatsCard
          title="Productos activos"
          value={productsRes.count ?? 0}
          icon={Package}
          color="purple"
        />
        <StatsCard
          title="Clientes"
          value={customersCount}
          icon={Users}
          color="yellow"
        />
      </div>

      {/* Pedidos recientes */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pedidos recientes</h2>
          <Link href="/admin/pedidos" className="text-sm text-[var(--color-primary)] hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {(recentOrdersRes.data ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No hay pedidos aún.</p>
          ) : (
            (recentOrdersRes.data ?? []).map((order: any) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-400">
                    {order.profiles?.full_name ?? 'Cliente'} ·{' '}
                    {new Date(order.created_at).toLocaleDateString('es-EC')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(order.total, store.currency)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
    pending:    { label: 'Pendiente',   variant: 'warning' },
    paid:       { label: 'Pagado',      variant: 'success' },
    processing: { label: 'Procesando', variant: 'default' },
    shipped:    { label: 'Enviado',     variant: 'default' },
    delivered:  { label: 'Entregado',  variant: 'success' },
    cancelled:  { label: 'Cancelado',  variant: 'error' },
    refunded:   { label: 'Reembolsado',variant: 'error' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
