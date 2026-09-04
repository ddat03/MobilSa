import { NextRequest, NextResponse } from 'next/server'
import { resolverPagoVerificacion, PagoNoEncontradoError } from '@/lib/pagosVerificacion'

/**
 * Endpoint para que n8n apruebe/rechace un pago desde el workflow de Telegram
 * (botones "Aprobar"/"Rechazar" en la alerta) sin pasar por sesión de usuario.
 * Ver supabase/README.md → n8n para el workflow completo.
 *
 * POST /api/pagos-verificacion/<id>
 * Header:  Authorization: Bearer <N8N_SHARED_SECRET>
 * Body:    { "accion": "aprobar" | "rechazar", "notas"?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.N8N_SHARED_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'N8N_SHARED_SECRET no configurado en el servidor' }, { status: 500 })
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const accion = body.accion as 'aprobar' | 'rechazar'
  if (accion !== 'aprobar' && accion !== 'rechazar') {
    return NextResponse.json({ error: 'accion debe ser "aprobar" o "rechazar"' }, { status: 400 })
  }

  try {
    const { nuevoEstado, pago } = await resolverPagoVerificacion(id, accion, { notas: body.notas ?? null })
    return NextResponse.json({ ok: true, pagoId: id, storeId: pago.store_id, nuevoEstado })
  } catch (err: any) {
    if (err instanceof PagoNoEncontradoError) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }
    console.error('[pagos-verificacion] error:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
