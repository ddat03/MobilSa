import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import { updateOrderStatus } from '../../actions/orders'
import { WhatsAppNotifyButton } from '@/components/store/WhatsAppButton'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Esperando pago' },
  { value: 'pending',    label: 'Pendiente' },
  { value: 'paid',       label: 'Pagado' },
  { value: 'processing', label: 'Procesando' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregado' },
  { value: 'cancelled',  label: 'Cancelado' },
  { value: 'refunded',   label: 'Reembolsado' },
]

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending_payment: 'warning', pending: 'warning', paid: 'success',
  processing: 'default', shipped: 'default', delivered: 'success',
  cancelled: 'error', refunded: 'error',
}

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone, avatar_url), items:order_items(*)')
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()

  const storeConfig = store

  if (!order) notFound()

  const address = order.shipping_address as any

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pedidos" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleString('es-EC')}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={STATUS_VARIANT[order.status] ?? 'default'} className="text-sm px-3 py-1">
            {ORDER_STATUSES.find((s) => s.value === order.status)?.label ?? order.status}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
          <p className="font-medium text-gray-900">{(order as any).profiles?.full_name ?? 'Sin nombre'}</p>
          {(order as any).profiles?.phone && (
            <p className="text-sm text-gray-500">{(order as any).profiles.phone}</p>
          )}
        </div>

        {/* Dirección */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Envío</p>
          {address ? (
            <>
              <p className="text-sm font-medium text-gray-900">{address.full_name}</p>
              <p className="text-sm text-gray-500">{address.street}</p>
              <p className="text-sm text-gray-500">{address.city}{address.province ? `, ${address.province}` : ''}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin dirección</p>
          )}
        </div>

        {/* Pago */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pago</p>
          <p className="text-sm text-gray-700">{order.payment_method ?? 'No especificado'}</p>
          {order.payment_id && (
            <p className="text-xs text-gray-400 font-mono mt-1 truncate">{order.payment_id}</p>
          )}
          {order.paid_at && (
            <p className="text-xs text-green-600 mt-1">
              Pagado el {new Date(order.paid_at).toLocaleDateString('es-EC')}
            </p>
          )}
        </div>
      </div>

      {/* Items del pedido */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Productos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {((order as any).items ?? []).map((item: any) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                {item.variant_info && (
                  <p className="text-xs text-gray-400">{item.variant_info}</p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-500">x{item.quantity}</p>
                <p className="font-semibold text-gray-900">
                  {formatPrice(item.total_price, store.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 space-y-1.5 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal, store.currency)}</span>
          </div>
          {order.shipping_cost > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Envío</span>
              <span>{formatPrice(order.shipping_cost, store.currency)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{formatPrice(order.discount, store.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(order.total, store.currency)}</span>
          </div>
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-800">Cambiar estado del pedido</p>
          {(order as any).profiles?.phone && storeConfig?.whatsapp_number && (
            <WhatsAppNotifyButton
              number={(order as any).profiles.phone.replace(/\D/g, '')}
              orderNumber={order.order_number}
              status={order.status}
            />
          )}
        </div>
        <form action={updateOrderStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={order.id} />
          {ORDER_STATUSES.map((s) => (
            <button
              key={s.value}
              type="submit"
              name="status"
              value={s.value}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                ${order.status === s.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-gray-200 text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
            >
              {s.label}
            </button>
          ))}
        </form>
        {order.notes && (
          <p className="mt-3 text-sm text-gray-500 bg-yellow-50 rounded-lg px-3 py-2">
            Nota: {order.notes}
          </p>
        )}
      </div>
    </div>
  )
}
