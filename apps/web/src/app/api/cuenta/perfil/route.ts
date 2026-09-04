import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = authHeader.slice(7)
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { full_name, phone } = await req.json()
  await admin.from('profiles').update({ full_name, phone }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
