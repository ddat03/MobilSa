'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'

export async function updateOrderStatus(formData: FormData) {
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'paid') update.paid_at = new Date().toISOString()

  await supabase.from('orders').update(update).eq('id', id).eq('store_id', store.id)
  revalidatePath('/admin/pedidos')
  revalidatePath(`/admin/pedidos/${id}`)
}
