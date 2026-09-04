'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const full_name = (formData.get('full_name') as string)?.trim()
  const phone     = (formData.get('phone') as string)?.trim() || null

  const admin = createAdminClient()
  await admin.from('profiles').update({ full_name, phone }).eq('id', user.id)

  revalidatePath('/cuenta')
}
