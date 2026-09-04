'use server'
import { revalidatePath } from 'next/cache'
import { requireAdminStore } from '@/lib/store'
import { resolverPagoVerificacion, PagoNoEncontradoError } from '@/lib/pagosVerificacion'

async function revisar(formData: FormData, decision: 'aprobar' | 'rechazar') {
  const store = await requireAdminStore()
  const id = formData.get('id') as string
  const notas = (formData.get('notas') as string)?.trim() || null

  try {
    await resolverPagoVerificacion(id, decision, { storeId: store.id, notas })
  } catch (err) {
    if (err instanceof PagoNoEncontradoError) throw new Error('Pago no encontrado en este negocio')
    throw err
  }

  revalidatePath('/admin/pagos')
  revalidatePath('/admin/pedidos')
  revalidatePath('/admin')
}

export async function aprobarPago(formData: FormData) {
  await revisar(formData, 'aprobar')
}

export async function rechazarPago(formData: FormData) {
  await revisar(formData, 'rechazar')
}
