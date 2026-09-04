'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'

export async function updateStoreConfig(formData: FormData) {
  const store = await requireAdminStore()
  const supabase = createAdminClient()

  const name            = (formData.get('name') as string)?.trim()
  const primary_color   = formData.get('primary_color') as string
  const secondary_color = formData.get('secondary_color') as string
  const logo_url        = (formData.get('logo_url') as string)?.trim() || null
  const currency        = (formData.get('currency') as string) || 'USD'
  const whatsapp_number = (formData.get('whatsapp_number') as string)?.trim().replace(/\D/g, '') || null
  const instagram_url   = (formData.get('instagram_url') as string)?.trim() || null
  const tiktok_url      = (formData.get('tiktok_url') as string)?.trim() || null

  if (!name) throw new Error('El nombre de la tienda es obligatorio')

  const deuna_phone   = (formData.get('deuna_phone') as string)?.trim() || null
  const deuna_qr_url  = (formData.get('deuna_qr_url') as string)?.trim() || null
  const bank_name     = (formData.get('bank_name') as string)?.trim() || null
  const bank_account  = (formData.get('bank_account') as string)?.trim() || null
  const bank_holder   = (formData.get('bank_holder') as string)?.trim() || null
  const bank_id       = (formData.get('bank_id') as string)?.trim() || null

  const { error } = await supabase
    .from('store_config')
    .update({
      name, primary_color, secondary_color, logo_url, currency,
      whatsapp_number, instagram_url, tiktok_url,
      deuna_phone, deuna_qr_url, bank_name, bank_account, bank_holder, bank_id,
    })
    .eq('id', store.id)

  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  revalidatePath('/admin/configuracion')
  return { success: true }
}
