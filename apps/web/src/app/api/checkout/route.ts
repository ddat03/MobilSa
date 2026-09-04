import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getStore } from '@/lib/store'
import type { CartLineItem } from '@/store/cart'

export async function POST(req: NextRequest) {
  try {
    const { items, shippingAddress, userId } = await req.json() as {
      items: CartLineItem[]
      shippingAddress: {
        full_name: string
        phone: string
        street: string
        city: string
        province: string
        country: string
      }
      userId: string | null
    }

    if (!items?.length) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    }

    const store = await getStore()

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const lineItems = items.map((item) => ({
      price_data: {
        currency: (store.currency ?? 'usd').toLowerCase(),
        product_data: {
          name: item.productName,
          description: item.variantInfo || undefined,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }))

    const shipping = store.shipping_flat_rate ?? 0
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: (store.currency ?? 'usd').toLowerCase(),
          product_data: {
            name: 'Envío',
            description: 'Costo de envío',
            images: [],
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelado`,
      metadata: {
        store_id: store.id,
        user_id: userId ?? '',
        shipping_address: JSON.stringify(shippingAddress),
        items_summary: JSON.stringify(
          items.map((i) => ({
            variant_id: i.variantId,
            product_name: i.productName,
            variant_info: i.variantInfo,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          }))
        ),
      },
      customer_email: undefined,
      phone_number_collection: { enabled: false },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
