import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { ACTIVE_CONFIG } from '@ecommerce/config'
import Link from 'next/link'
import { ShoppingBag, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendiente',
  paid:       'Pagado',
  processing: 'Procesando',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
  refunded:   'Reembolsado',
}
const STATUS_COLOR: Record<string, string> = {
  pending:    'text-yellow-600 bg-yellow-50',
  paid:       'text-green-600 bg-green-50',
  processing: 'text-blue-600 bg-blue-50',
  shipped:    'text-blue-600 bg-blue-50',
  delivered:  'text-green-600 bg-green-50',
  cancelled:  'text-red-500 bg-red-50',
  refunded:   'text-red-500 bg-red-50',
}

export default async function MisPedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: orders } = await admin
    .from('orders')
    .select('*, items:order_items(product_name, quantity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container-px py-10 max-w-2xl">
      <div className="mb-8">
        <Link href="/cuenta" className="eyebrow mb-2 hover:text-black transition-colors flex items-center gap-1">
          ← Mi cuenta
        </Link>
        <h1 className="heading-md text-black mt-2">Mis pedidos</h1>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white border border-gray-100 py-24 flex flex-col items-center gap-4">
          <ShoppingBag size={40} className="text-gray-200" />
          <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Sin pedidos aún</p>
          <Link href="/productos" className="btn-primary mt-2">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white border border-gray-100 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-mono font-bold text-black text-sm">{order.order_number}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${STATUS_COLOR[order.status] ?? 'text-gray-600 bg-gray-100'}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(order.created_at).toLocaleDateString('es-EC', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.items?.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-black">{formatPrice(order.total, ACTIVE_CONFIG.currency)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.items?.length ?? 0} producto{order.items?.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
