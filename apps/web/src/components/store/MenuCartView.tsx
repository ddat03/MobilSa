'use client'
import { useMenuCartStore } from '@/store/menuCart'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { Trash2, Plus, Minus, UtensilsCrossed, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function MenuCartView({
  storeName: _storeName, whatsappNumber, currency,
}: { storeName: string; whatsappNumber: string | null; currency: string }) {
  const { items, removeItem, updateQuantity, total, itemCount } = useMenuCartStore()
  const cartTotal = total()
  const count = itemCount()

  if (count === 0) {
    return (
      <div className="py-24 text-center">
        <UtensilsCrossed size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Tu pedido está vacío</h2>
        <p className="text-gray-400 mb-6">Agregá platos del menú para armar tu pedido.</p>
        <Link href="/menu">
          <Button>Ver menú</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tu pedido ({count})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.platoId} className="flex gap-4 bg-white rounded-xl p-4 border border-gray-100 items-center">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.nombre}</p>
                <p className="text-sm font-semibold text-[var(--color-primary)] mt-1">
                  {formatPrice(item.precio, currency)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(item.platoId)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(item.platoId, item.quantity - 1)} className="p-1.5 hover:bg-gray-50 text-gray-600">
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.platoId, item.quantity + 1)} className="p-1.5 hover:bg-gray-50 text-gray-600">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit sticky top-20">
          <h2 className="font-bold text-gray-900 mb-4">Resumen</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{formatPrice(cartTotal, currency)}</span>
            </div>
          </div>

          {whatsappNumber ? (
            <Link href="/pedir" className="btn-primary w-full flex items-center justify-center gap-2">
              Continuar pedido <ArrowRight size={16} />
            </Link>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              Este negocio todavía no configuró un WhatsApp para pedidos.
            </p>
          )}

          <Link href="/menu" className="block mt-3">
            <Button variant="ghost" size="md" className="w-full text-sm">
              Seguir viendo el menú
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
