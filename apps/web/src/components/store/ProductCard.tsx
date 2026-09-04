import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@ecommerce/core'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : null

  const firstImage = product.images?.[0] ?? null

  return (
    <Link href={`/productos/${product.slug}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-100">
            👕
          </div>
        )}

        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-end justify-center pb-5">
          <span className="btn-primary text-[11px] py-2.5 px-5 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            Ver producto
          </span>
        </div>

        {/* Badges */}
        {discountPct && (
          <span className="absolute top-3 left-3 badge">−{discountPct}%</span>
        )}
        {product.featured && !discountPct && (
          <span className="absolute top-3 left-3 badge-dark">Destacado</span>
        )}
      </div>

      {/* Info */}
      <div className="pt-3 pb-1">
        {product.category?.name && (
          <p className="eyebrow text-[10px] mb-1">{product.category.name}</p>
        )}
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 uppercase tracking-wide">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-bold text-black">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.compare_at_price!)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
