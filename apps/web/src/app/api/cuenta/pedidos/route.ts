import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const admin = createAdminClient()

  // Support Bearer token from mobile app
  const authHeader = req.headers.get('authorization')
  let userId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  } else {
    // Cookie-based session from web
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) return NextResponse.json({ orders: [] })

  const { data: orders } = await admin
    .from('orders')
    .select('id,order_number,status,total,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ orders: orders ?? [] })
}
