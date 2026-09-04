'use client'
import { useState } from 'react'
import { useCartStore } from '@/store/cart'
import type { Product, ProductVariant } from '@ecommerce/core'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  product: Product
  colors: string[]
  sizes: string[]
}

export function AddToCartButton({ product, colors, sizes }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null)
  const [selectedSize,  setSelectedSize]  = useState<string | null>(sizes[0] ?? null)
  const [added, setAdded] = useState(false)

  const matchingVariant: ProductVariant | undefined = product.variants?.find((v) => {
    const colorMatch = !v.color || v.color === selectedColor
    const sizeMatch  = !v.size  || v.size  === selectedSize
    return colorMatch && sizeMatch
  })

  const inStock = matchingVariant ? matchingVariant.stock > 0 : false

  function handleAddToCart() {
    if (!matchingVariant) return
    const variantInfo = [selectedColor, selectedSize].filter(Boolean).join(' / ')
    addItem({
      variantId:   matchingVariant.id,
      productId:   product.id,
      productName: product.name,
      variantInfo,
      image:       product.images[0] ?? '',
      unitPrice:   matchingVariant.price ?? product.price,
      quantity:    1,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Color */}
      {colors.length > 0 && (
        <div>
          <p className="label-sm">
            Color: <span className="font-normal normal-case tracking-normal">{selectedColor}</span>
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${
                  selectedColor === color
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-600 hover:border-black'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Talla */}
      {sizes.length > 0 && (
        <div>
          <p className="label-sm">
            Talla: <span className="font-normal normal-case tracking-normal">{selectedSize}</span>
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {sizes.map((size) => {
              const variantForSize = product.variants?.find(
                (v) => v.size === size && (!v.color || v.color === selectedColor)
              )
              const outOfStock = variantForSize ? variantForSize.stock === 0 : false

              return (
                <button
                  key={size}
                  onClick={() => !outOfStock && setSelectedSize(size)}
                  disabled={outOfStock}
                  className={`w-12 h-12 text-xs font-bold uppercase border transition-all ${
                    selectedSize === size
                      ? 'border-black bg-black text-white'
                      : outOfStock
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : 'border-gray-200 text-gray-700 hover:border-black'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stock info */}
      {matchingVariant && (
        <p className={`text-xs font-bold uppercase tracking-widest ${inStock ? 'text-green-600' : 'text-red-500'}`}>
          {inStock ? `${matchingVariant.stock} disponibles` : 'Sin stock'}
        </p>
      )}

      {/* Botón */}
      <button
        onClick={handleAddToCart}
        disabled={!inStock || !matchingVariant}
        className={`w-full flex items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest transition-all duration-200 ${
          added
            ? 'bg-green-600 text-white'
            : !inStock || !matchingVariant
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-[var(--color-secondary)] active:scale-[0.99]'
        }`}
      >
        {added ? (
          <><Check size={17} /> Agregado al carrito</>
        ) : (
          <><ShoppingCart size={17} /> Agregar al carrito</>
        )}
      </button>
    </div>
  )
}
