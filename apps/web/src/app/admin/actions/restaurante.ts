'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'

const ESTADOS_PEDIDO = ['pendiente_pago','pago_en_revision','pagado','preparando','listo_o_en_camino','entregado','cancelado']
const ESTADOS_RESERVA = ['pendiente_pago','pago_en_revision','confirmada','cancelada','completada']

export async function actualizarEstadoPedidoRestaurante(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const estado = formData.get('estado') as string
  if (!ESTADOS_PEDIDO.includes(estado)) throw new Error('Estado inválido')
  const supabase = createAdminClient()
  await supabase.from('pedidos_restaurante').update({ estado }).eq('id', id).eq('store_id', store.id)
  revalidatePath('/admin/pedidos')
}

export async function actualizarEstadoReservacion(formData: FormData) {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const estado = formData.get('estado') as string
  if (!ESTADOS_RESERVA.includes(estado)) throw new Error('Estado inválido')
  const supabase = createAdminClient()
  await supabase.from('reservaciones').update({ estado }).eq('id', id).eq('store_id', store.id)
  revalidatePath('/admin/pedidos')
}
