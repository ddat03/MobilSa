'use client'
import { useState } from 'react'
import { Plus, Minus, UtensilsCrossed } from 'lucide-react'
import { useMenuCartStore } from '@/store/menuCart'
import { formatPrice } from '@/lib/utils'
import type { MenuPlato } from '@ecommerce/core'

export function MenuItemCard({ plato, currency }: { plato: MenuPlato; currency: string }) {
  const { items, addItem, updateQuantity } = useMenuCartStore()
  const [justAdded, setJustAdded] = useState(false)
  const enCarrito = items.find((i) => i.platoId === plato.id)

  function agregar() {
    addItem({ platoId: plato.id, nombre: plato.nombre, precio: plato.precio })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 700)
  }

  return (
    <div className="bg-white border border-gray-100 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center">
        {plato.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plato.foto_url} alt={plato.nombre} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <UtensilsCrossed size={28} className="text-gray-200" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="font-bold text-black text-sm leading-tight">{plato.nombre}</p>
        {plato.descripcion && (
          <p className="text-xs text-gray-400 line-clamp-2">{plato.descripcion}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-black">{formatPrice(plato.precio, currency)}</span>

          {enCarrito ? (
            <div className="flex items-center gap-2 border border-gray-200 rounded-full overflow-hidden">
              <button onClick={() => updateQuantity(plato.id, enCarrito.quantity - 1)}
                className="p-1.5 hover:bg-gray-50 text-gray-600">
                <Minus size={13} />
              </button>
              <span className="text-sm font-bold w-4 text-center">{enCarrito.quantity}</span>
              <button onClick={() => updateQuantity(plato.id, enCarrito.quantity + 1)}
                className="p-1.5 hover:bg-gray-50 text-gray-600">
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={agregar}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                justAdded ? 'bg-green-500' : 'bg-black hover:bg-[var(--color-secondary)]'
              } text-white`}
              aria-label={`Agregar ${plato.nombre}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
