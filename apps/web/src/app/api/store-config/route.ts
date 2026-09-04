import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export async function GET() {
  const store = await getStore()
  if (!store) return NextResponse.json({})
  return NextResponse.json({
    deuna_phone:     store.deuna_phone,
    deuna_qr_url:    store.deuna_qr_url,
    bank_name:       store.bank_name,
    bank_account:    store.bank_account,
    bank_holder:     store.bank_holder,
    bank_id:         store.bank_id,
    whatsapp_number: store.whatsapp_number,
  })
}
