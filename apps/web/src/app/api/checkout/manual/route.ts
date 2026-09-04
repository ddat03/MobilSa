import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'
import { NextResponse } from 'next/server'

function generateOrderNumber() {
  const date = new Date()
  const d = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${d}-${rand}`
}

export async function POST(req: Request) {
  try {
    const { items, shippingAddress, userId, paymentMethod, subtotal, shipping, total, comprobanteUrl } = await req.json()

    if (!items?.length) return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    // Tanto el sitio web (CheckoutForm.tsx) como la app móvil (CheckoutScreen.tsx)
    // suben el comprobante antes de llamar acá — sin comprobante no hay forma de
    // verificar el pago manual, así que se exige siempre.
    if (!comprobanteUrl) {
      return NextResponse.json({ error: 'Falta subir el comprobante de pago' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const store = await getStore()

    if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 500 })

    const orderNumber = generateOrderNumber()

    // Calculate total from items if not provided (mobile app omits subtotal/shipping/total)
    const calculatedSubtotal = subtotal ?? items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0)
    const calculatedShipping = shipping ?? 0
    const calculatedTotal    = total    ?? calculatedSubtotal + calculatedShipping

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id:         store.id,
        user_id:          userId ?? null,
        order_number:     orderNumber,
        status:           'pago_en_revision',
        channel:          'web', // web y app móvil comparten este canal; telegram/whatsapp son el bot
        payment_method:   paymentMethod ?? 'manual',
        subtotal:         calculatedSubtotal,
        shipping_cost:    calculatedShipping,
        discount:         0,
        total:            calculatedTotal,
        shipping_address: shippingAddress,
        comprobante_url:  comprobanteUrl,
      })
      .select('id, order_number')
      .single()

    if (orderError) throw new Error(orderError.message)

    const orderItems = items.map((item: any) => ({
      order_id:     order.id,
      product_id:   item.productId,
      variant_id:   item.variantId,
      product_name: item.productName,
      variant_info: item.variantInfo ?? null,
      quantity:     item.quantity,
      unit_price:   item.unitPrice,
      total_price:  item.unitPrice * item.quantity,
    }))

    await supabase.from('order_items').insert(orderItems)

    await supabase.from('pagos_verificacion').insert({
      store_id:         store.id,
      referencia_tipo:  'pedido_tienda',
      referencia_id:    order.id,
      comprobante_url:  comprobanteUrl,
      monto_declarado:  calculatedTotal,
      metodo_pago:      paymentMethod ?? 'manual',
      estado:           'pendiente',
    })

    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
