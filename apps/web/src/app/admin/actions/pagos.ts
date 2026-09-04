'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'

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

async function resolverPago(pagoId: string, storeId: string) {
  const supabase = createAdminClient()
  const { data: pago } = await supabase
    .from('pagos_verificacion')
    .select('*')
    .eq('id', pagoId)
    .eq('store_id', storeId)
    .maybeSingle()
  if (!pago) throw new Error('Pago no encontrado')
  const tabla = TABLA_POR_TIPO[pago.referencia_tipo as keyof typeof TABLA_POR_TIPO]
  if (!tabla) throw new Error('Tipo de referencia desconocido')
  return { supabase, pago, tabla }
}

export async function aprobarPago(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const { supabase, pago, tabla } = await resolverPago(id, store.id)

  const columnaEstado = COLUMNA_ESTADO[tabla]
  const nuevoEstado = ESTADO_APROBADO[tabla]
  const update: Record<string, unknown> = { [columnaEstado]: nuevoEstado }
  if (tabla === 'orders') update.paid_at = new Date().toISOString()

  await supabase.from(tabla).update(update).eq('id', pago.referencia_id).eq('store_id', store.id)
  await supabase.from('pagos_verificacion').update({
    estado: 'aprobado',
    fecha_revision: new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/admin/pagos')
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin')
}

export async function rechazarPago(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const notas = (formData.get('notas') as string)?.trim() || null
  const { supabase, pago, tabla } = await resolverPago(id, store.id)

  const columnaEstado = COLUMNA_ESTADO[tabla]
  const nuevoEstado = ESTADO_RECHAZADO[tabla]

  await supabase.from(tabla).update({ [columnaEstado]: nuevoEstado }).eq('id', pago.referencia_id).eq('store_id', store.id)
  await supabase.from('pagos_verificacion').update({
    estado: 'rechazado',
    fecha_revision: new Date().toISOString(),
    notas,
  }).eq('id', id)

  revalidatePath('/admin/pagos')
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin')
}
