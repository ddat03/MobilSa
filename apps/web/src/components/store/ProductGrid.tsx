import { ProductCard } from './ProductCard'
import type { Product } from '@ecommerce/core'

interface ProductGridProps {
  products: Product[]
  emptyMessage?: string
}

export function ProductGrid({ products, emptyMessage = 'No hay productos disponibles.' }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        <p className="text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
