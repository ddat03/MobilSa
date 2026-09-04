import { Badge } from '@/components/ui/Badge'
import { CalendarClock, ShoppingBag } from 'lucide-react'
import {
  actualizarEstadoPedidoRestaurante,
  actualizarEstadoReservacion,
} from '@/app/admin/actions/restaurante'
import type { PedidoRestaurante, Reservacion } from '@ecommerce/core'

const ESTADOS_PEDIDO = ['pendiente_pago','pago_en_revision','pagado','preparando','listo_o_en_camino','entregado','cancelado']
const ESTADOS_RESERVA = ['pendiente_pago','pago_en_revision','confirmada','cancelada','completada']

const variant = (e: string): 'default' | 'success' | 'warning' | 'error' =>
  e.includes('cancel') ? 'error'
  : e === 'entregado' || e === 'confirmada' || e === 'completada' || e === 'pagado' ? 'success'
  : e === 'pago_en_revision' || e === 'pendiente_pago' ? 'warning'
  : 'default'

export function RestauranteOrdersView({
  pedidos, reservas, currency,
}: { pedidos: PedidoRestaurante[]; reservas: Reservacion[]; currency: string }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency || 'USD' }).format(n)

  return (
    <div className="space-y-10">
      {/* Pedidos */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShoppingBag size={22} /> Pedidos
        </h1>
        <p className="text-sm text-gray-500 mb-4">{pedidos.length} pedidos (recoger / domicilio)</p>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {pedidos.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Todavía no hay pedidos.</p>
          ) : pedidos.map((p) => (
            <div key={p.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium text-gray-900">{p.cliente_nombre}</p>
                <p className="text-xs text-gray-400">
                  {p.modalidad} · {new Date(p.created_at).toLocaleString('es-EC')}
                  {p.cliente_telefono ? ` · ${p.cliente_telefono}` : ''}
                </p>
              </div>
              <span className="text-sm font-semibold">{fmt(p.total)}</span>
              <Badge variant={variant(p.estado)}>{p.estado}</Badge>
              <form action={actualizarEstadoPedidoRestaurante} className="flex items-center gap-1">
                <input type="hidden" name="id" value={p.id} />
                <select name="estado" defaultValue={p.estado} className="text-xs border border-gray-200 rounded-md px-2 py-1">
                  {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button type="submit" className="text-xs text-[var(--color-primary)] hover:underline">ok</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* Reservas */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <CalendarClock size={20} /> Reservas
        </h2>
        <p className="text-sm text-gray-500 mb-4">{reservas.length} reservas de mesa</p>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {reservas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Todavía no hay reservas.</p>
          ) : reservas.map((r) => (
            <div key={r.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium text-gray-900">{r.cliente_nombre}</p>
                <p className="text-xs text-gray-400">
                  {r.fecha} {r.hora} · {r.numero_personas} personas
                  {r.cliente_telefono ? ` · ${r.cliente_telefono}` : ''}
                </p>
              </div>
              <span className="text-sm font-semibold">anticipo {fmt(r.anticipo_monto)}</span>
              <Badge variant={variant(r.estado)}>{r.estado}</Badge>
              <form action={actualizarEstadoReservacion} className="flex items-center gap-1">
                <input type="hidden" name="id" value={r.id} />
                <select name="estado" defaultValue={r.estado} className="text-xs border border-gray-200 rounded-md px-2 py-1">
                  {ESTADOS_RESERVA.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button type="submit" className="text-xs text-[var(--color-primary)] hover:underline">ok</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
