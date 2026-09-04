'use client'
import { useCartStore } from '@/store/cart'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function TiendaCartView({ currency, shipping }: { currency: string; shipping: number }) {
  const { items, removeItem, updateQuantity, total, itemCount } = useCartStore()
  const cartTotal = total()
  const count = itemCount()

  if (count === 0) {
    return (
      <div className="py-24 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-400 mb-6">Agrega productos para comenzar.</p>
        <Link href="/productos">
          <Button>Ver productos</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Carrito ({count})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="flex gap-4 bg-white rounded-xl p-4 border border-gray-100">
              {/* Imagen */}
              <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-50">
                {item.image && (
                  <Image src={item.image} alt={item.productName} fill className="object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                {item.variantInfo && (
                  <p className="text-sm text-gray-400">{item.variantInfo}</p>
                )}
                <p className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                  {formatPrice(item.unitPrice, currency)}
                </p>
              </div>

              {/* Cantidad */}
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="p-1.5 hover:bg-gray-50 text-gray-600"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="p-1.5 hover:bg-gray-50 text-gray-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit sticky top-20">
          <h2 className="font-bold text-gray-900 mb-4">Resumen del pedido</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(cartTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span>
              <span>{shipping === 0 ? 'Gratis' : formatPrice(shipping, currency)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(cartTotal + shipping, currency)}</span>
            </div>
          </div>

          <Link href="/checkout" className="block mt-6">
            <Button size="lg" className="w-full">
              Proceder al pago
            </Button>
          </Link>

          <Link href="/productos" className="block mt-3">
            <Button variant="ghost" size="md" className="w-full text-sm">
              Seguir comprando
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
