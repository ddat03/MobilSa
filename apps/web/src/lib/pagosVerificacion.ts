import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

const TABLA_POR_TIPO = {
  pedido_tienda: 'orders',
  pedido_restaurante: 'pedidos_restaurante',
  reservacion: 'reservaciones',
} as const

const COLUMNA_ESTADO: Record<string, string> = {
  orders: 'status',
  pedidos_restaurante: 'estado',
  reservaciones: 'estado',
}

const ESTADO_APROBADO: Record<string, string> = {
  orders: 'paid',
  pedidos_restaurante: 'pagado',
  reservaciones: 'confirmada',
}

const ESTADO_RECHAZADO: Record<string, string> = {
  orders: 'cancelled',
  pedidos_restaurante: 'cancelado',
  reservaciones: 'cancelada',
}

export class PagoNoEncontradoError extends Error {}

/**
 * Aprueba o rechaza un pago en revisión y cascada el estado a la tabla de origen
 * (orders / pedidos_restaurante / reservaciones). Usada tanto por el panel
 * /admin/pagos (admin/actions/pagos.ts, scopeado por store_id de la sesión) como
 * por el endpoint que llama n8n (api/pagos-verificacion/[id]/route.ts, autenticado
 * por secreto compartido en vez de sesión).
 */
export async function resolverPagoVerificacion(
  pagoId: string,
  decision: 'aprobar' | 'rechazar',
  opts: { storeId?: string; notas?: string | null } = {},
) {
  const supabase = createAdminClient()

  let query = supabase.from('pagos_verificacion').select('*').eq('id', pagoId)
  if (opts.storeId) query = query.eq('store_id', opts.storeId)
  const { data: pago } = await query.maybeSingle()
  if (!pago) throw new PagoNoEncontradoError('Pago no encontrado')

  const tabla = TABLA_POR_TIPO[pago.referencia_tipo as keyof typeof TABLA_POR_TIPO]
  if (!tabla) throw new Error(`Tipo de referencia desconocido: ${pago.referencia_tipo}`)

  const columnaEstado = COLUMNA_ESTADO[tabla]
  const nuevoEstado = decision === 'aprobar' ? ESTADO_APROBADO[tabla] : ESTADO_RECHAZADO[tabla]

  const updateOrigen: Record<string, unknown> = { [columnaEstado]: nuevoEstado }
  if (tabla === 'orders' && decision === 'aprobar') updateOrigen.paid_at = new Date().toISOString()

  await supabase.from(tabla).update(updateOrigen).eq('id', pago.referencia_id).eq('store_id', pago.store_id)

  await supabase.from('pagos_verificacion').update({
    estado: decision === 'aprobar' ? 'aprobado' : 'rechazado',
    fecha_revision: new Date().toISOString(),
    notas: opts.notas ?? null,
  }).eq('id', pagoId)

  return { pago, tabla, nuevoEstado }
}
