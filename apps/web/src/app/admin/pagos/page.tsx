import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import { aprobarPago, rechazarPago } from '../actions/pagos'
import { CreditCard, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ estado?: string }>
}

const REFERENCIA_LABEL: Record<string, string> = {
  pedido_tienda: 'Pedido',
  pedido_restaurante: 'Pedido (restaurante)',
  reservacion: 'Reserva',
}

export default async function PagosAdminPage({ searchParams }: PageProps) {
  const { estado = 'pendiente' } = await searchParams
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  let query = supabase
    .from('pagos_verificacion')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (estado !== 'todos') query = query.eq('estado', estado)

  const { data: pagos } = await query

  // Resolver referencia (order_number / cliente) y signed URL del comprobante en paralelo
  const enriquecidos = await Promise.all(
    (pagos ?? []).map(async (p) => {
      const [{ data: signed }, referencia] = await Promise.all([
        supabase.storage.from('comprobantes').createSignedUrl(p.comprobante_url, 600),
        resolverReferencia(supabase, p.referencia_tipo, p.referencia_id),
      ])
      return { ...p, comprobanteSignedUrl: signed?.signedUrl ?? null, referencia }
    })
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos por verificar</h1>
        <p className="text-sm text-gray-500">{enriquecidos.length} resultados</p>
      </div>

      <div className="flex gap-2 mb-5">
        {['pendiente', 'aprobado', 'rechazado', 'todos'].map((e) => (
          <a key={e} href={`/admin/pagos?estado=${e}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              estado === e ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            {e[0].toUpperCase() + e.slice(1)}
          </a>
        ))}
      </div>

      {enriquecidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No hay pagos {estado !== 'todos' ? `en estado "${estado}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriquecidos.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
              <a href={p.comprobanteSignedUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                className="block bg-gray-50 aspect-[4/3] flex items-center justify-center overflow-hidden">
                {p.comprobanteSignedUrl && !p.comprobante_url.endsWith('.pdf') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.comprobanteSignedUrl} alt="Comprobante" className="object-cover w-full h-full" />
                ) : (
                  <FileText size={32} className="text-gray-300" />
                )}
              </a>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {REFERENCIA_LABEL[p.referencia_tipo] ?? p.referencia_tipo}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('es-EC')}</span>
                </div>
                <p className="font-medium text-gray-900 text-sm">{p.referencia?.label ?? p.referencia_id.slice(0, 8)}</p>
                {p.referencia?.detalle && <p className="text-xs text-gray-500">{p.referencia.detalle}</p>}
                <p className="text-sm font-semibold text-gray-900">
                  {p.monto_declarado != null ? formatPrice(p.monto_declarado, store.currency) : '—'} · {p.metodo_pago ?? 'sin especificar'}
                </p>

                {p.estado === 'pendiente' ? (
                  <div className="mt-auto pt-2 flex gap-2">
                    <form action={aprobarPago}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700">
                        Aprobar
                      </button>
                    </form>
                    <form action={rechazarPago}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100">
                        Rechazar
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="mt-auto pt-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      p.estado === 'aprobado' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function resolverReferencia(
  supabase: ReturnType<typeof createAdminClient>, tipo: string, id: string,
): Promise<{ label: string; detalle?: string } | null> {
  if (tipo === 'pedido_tienda') {
    const { data } = await supabase.from('orders').select('order_number, customer_name, shipping_address').eq('id', id).maybeSingle()
    if (!data) return null
    const nombre = data.customer_name ?? (data.shipping_address as any)?.full_name
    return { label: data.order_number, detalle: nombre ?? undefined }
  }
  if (tipo === 'pedido_restaurante') {
    const { data } = await supabase.from('pedidos_restaurante').select('cliente_nombre, modalidad').eq('id', id).maybeSingle()
    if (!data) return null
    return { label: data.cliente_nombre, detalle: data.modalidad }
  }
  if (tipo === 'reservacion') {
    const { data } = await supabase.from('reservaciones').select('cliente_nombre, fecha, hora').eq('id', id).maybeSingle()
    if (!data) return null
    return { label: data.cliente_nombre, detalle: `${data.fecha} ${data.hora}` }
  }
  return null
}
