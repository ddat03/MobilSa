import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] firma inválida:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    await handlePaymentSuccess(session)
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient()
  const meta = session.metadata ?? {}

  const store_id    = meta.store_id
  const user_id     = meta.user_id || null
  const shipping    = meta.shipping_address ? JSON.parse(meta.shipping_address) : {}
  const itemsSummary = meta.items_summary ? JSON.parse(meta.items_summary) : []

  // Obtener slug de la tienda para generar número de orden
  const { data: store } = await supabase
    .from('store_config').select('slug').eq('id', store_id).single()

  const orderNumber = store
    ? `${store.slug.toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    : `ORD-${Date.now()}`

  const subtotal = (session.amount_subtotal ?? 0) / 100
  const total    = (session.amount_total ?? 0) / 100

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      store_id,
      user_id: user_id || null,
      order_number: orderNumber,
      status: 'paid',
      subtotal,
      shipping_cost: 0,
      discount: 0,
      total,
      currency: session.currency?.toUpperCase() ?? 'USD',
      shipping_address: shipping,
      payment_method: 'stripe',
      payment_id: session.payment_intent as string,
    })
    .select('id')
    .single()

  if (error || !order) {
    console.error('[webhook] error creando orden:', error)
    return
  }

  // Insertar items del pedido
  if (itemsSummary.length > 0) {
    await supabase.from('order_items').insert(
      itemsSummary.map((item: any) => ({
        order_id: order.id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_info: item.variant_info || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }))
    )
  }

  console.log('[webhook] orden creada:', order.id, orderNumber)
}
