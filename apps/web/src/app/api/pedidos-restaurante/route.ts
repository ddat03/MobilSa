import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'

// Crea un pedido de restaurante (recoger/domicilio) desde el sitio público.
// No hay pago en la web (ver decisión en saasmultinegocioplan.md §6/Parte II.6):
// el pedido queda en pendiente_pago con canal 'web' y el negocio coordina el pago
// por WhatsApp — este endpoint sólo deja el registro para que aparezca en /admin/pedidos.
export async function POST(req: Request) {
  try {
    const { items, modalidad, cliente, notas } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El pedido está vacío' }, { status: 400 })
    }
    if (modalidad !== 'recoger' && modalidad !== 'domicilio') {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (!cliente?.nombre || !cliente?.telefono) {
      return NextResponse.json({ error: 'Faltan los datos de contacto' }, { status: 400 })
    }
    if (modalidad === 'domicilio' && !cliente?.direccion) {
      return NextResponse.json({ error: 'Falta la dirección de entrega' }, { status: 400 })
    }

    const store = await getStore()
    if (!store) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    if (store.tipo_servicio !== 'restaurante') {
      return NextResponse.json({ error: 'Este negocio no es un restaurante' }, { status: 400 })
    }

    const subtotal = items.reduce((s: number, i: any) => s + Number(i.precio) * Number(i.cantidad), 0)
    const costoEnvio = modalidad === 'domicilio' ? Number(store.shipping_flat_rate ?? 0) : 0
    const total = subtotal + costoEnvio

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pedidos_restaurante')
      .insert({
        store_id: store.id,
        modalidad,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono,
        items: items.map((i: any) => ({
          plato_id: i.platoId, nombre: i.nombre, cantidad: i.cantidad, precio_unit: i.precio,
        })),
        direccion_envio: modalidad === 'domicilio' ? { street: cliente.direccion } : null,
        costo_envio: costoEnvio,
        subtotal,
        total,
        estado: 'pendiente_pago',
        canal: 'web',
        notas: notas ?? null,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ id: data.id, referencia: data.id.slice(0, 8).toUpperCase(), total })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error creando el pedido' }, { status: 500 })
  }
}
