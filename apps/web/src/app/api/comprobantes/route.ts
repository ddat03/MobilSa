import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'

// Sube la foto/captura del comprobante de pago al bucket privado `comprobantes`.
// Server-side con service_role a propósito: el checkout admite invitados (sin
// sesión de Supabase Auth), así que no puede depender de las policies de storage.
export async function POST(req: NextRequest) {
  try {
    const store = await getStore()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no soportado (usa una foto o PDF)' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es muy pesado (máx. 10MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${store.slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const supabase = createAdminClient()
    const { error } = await supabase.storage
      .from('comprobantes')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ path })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error subiendo el comprobante' }, { status: 500 })
  }
}
