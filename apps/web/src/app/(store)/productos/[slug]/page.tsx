import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'
import { AddToCartButton } from '@/components/store/AddToCartButton'
import { WhatsAppProductButton } from '@/components/store/WhatsAppButton'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@ecommerce/core'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStore()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('name, description, images, price')
    .eq('slug', slug)
    .eq('store_id', store?.id ?? '')
    .maybeSingle()
  if (!data) return {}
  return {
    title: `${data.name} | ${store?.name ?? ''}`,
    description: data.description ?? `${data.name} — ${store?.name ?? ''}`,
    openGraph: {
      title: data.name,
      description: data.description ?? '',
      images: data.images?.[0] ? [{ url: data.images[0] }] : [],
    },
  }
}

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const store = await getStore()
  if (!store) notFound()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug), variants:product_variants(*)')
    .eq('slug', slug)
    .eq('store_id', store.id)
    .eq('active', true)
    .maybeSingle()

  const whatsappNumber = store.whatsapp_number ?? ''

  if (!data) notFound()

  const product = data as unknown as Product
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : null

  const colors = Array.from(new Set(product.variants?.map((v) => v.color).filter(Boolean) ?? []))
  const sizes  = Array.from(new Set(product.variants?.map((v) => v.size).filter(Boolean) ?? []))

  return (
    <div className="container-px py-8 md:py-12">
      {/* Breadcrumb */}
      <Link
        href={product.category?.slug ? `/productos?categoria=${product.category.slug}` : '/productos'}
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8"
      >
        <ChevronLeft size={14} />
        {product.category?.name ?? 'Productos'}
      </Link>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Galería */}
        <div className="space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🛍️
              </div>
            )}
            {discountPct && (
              <span className="absolute top-4 left-4 badge text-sm px-3 py-1">−{discountPct}%</span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0 overflow-hidden border border-gray-200 hover:border-black transition-colors">
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <div>
            {product.category?.name && (
              <p className="eyebrow mb-3">{product.category.name}</p>
            )}
            <h1 className="heading-md text-black leading-tight">{product.name}</h1>
          </div>

          {/* Precio */}
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-black">
              {formatPrice(product.price, store.currency)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compare_at_price!, store.currency)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-5">
              {product.description}
            </p>
          )}

          {/* Variantes + carrito */}
          <AddToCartButton product={product} colors={colors as string[]} sizes={sizes as string[]} />

          {/* WhatsApp */}
          <WhatsAppProductButton number={whatsappNumber} productName={product.name} />

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              {product.tags.map((tag) => (
                <span key={tag} className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 border border-gray-200 text-gray-500">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
