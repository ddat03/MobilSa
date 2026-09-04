import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'

// Crea una reserva de mesa desde el sitio público. Igual que los pedidos de
// restaurante: sin pago en la web, el anticipo se coordina por WhatsApp — este
// endpoint sólo deja el registro para que aparezca en /admin/pedidos.
export async function POST(req: Request) {
  try {
    const { cliente, fecha, hora, personas, notas } = await req.json()

    if (!cliente?.nombre || !cliente?.telefono) {
      return NextResponse.json({ error: 'Faltan los datos de contacto' }, { status: 400 })
    }
    if (!fecha || !hora) {
      return NextResponse.json({ error: 'Faltan fecha y hora' }, { status: 400 })
    }
    const numPersonas = parseInt(personas, 10)
    if (!numPersonas || numPersonas < 1) {
      return NextResponse.json({ error: 'Número de personas inválido' }, { status: 400 })
    }

    const store = await getStore()
    if (!store) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    if (store.tipo_servicio !== 'restaurante') {
      return NextResponse.json({ error: 'Este negocio no es un restaurante' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('reservaciones')
      .insert({
        store_id: store.id,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono,
        fecha,
        hora,
        numero_personas: numPersonas,
        anticipo_monto: 0,
        estado: 'pendiente_pago',
        canal: 'web',
        notas: notas ?? null,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ id: data.id, referencia: data.id.slice(0, 8).toUpperCase() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error creando la reserva' }, { status: 500 })
  }
}
