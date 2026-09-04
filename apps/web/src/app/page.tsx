import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'
import { Navbar } from '@/components/store/Navbar'
import { RestaurantHome } from '@/components/store/RestaurantHome'
import { ProductCard } from '@/components/store/ProductCard'
import { ScrollReveal } from '@/components/store/ScrollReveal'
import { NewsletterForm } from '@/components/store/NewsletterForm'
import type { Product } from '@ecommerce/core'
import { ArrowRight, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TICKER = '· NUEVA COLECCIÓN · ENVÍO GRATIS · MODA PREMIUM · ESTILO PROPIO · CALIDAD REAL · '

export default async function HomePage() {
  const store = await getStore()
  if (!store) notFound()
  if (store.tipo_servicio === 'restaurante') return <RestaurantHome store={store} />
  const supabase = createAdminClient()

  let { data: featured } = await supabase
    .from('products')
    .select('*, category:categories(id, name, slug), variants:product_variants(*)')
    .eq('store_id', store.id)
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!featured || featured.length === 0) {
    const { data: all } = await supabase
      .from('products')
      .select('*, category:categories(id, name, slug), variants:product_variants(*)')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(8)
    featured = all
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('store_id', store.id)
    .order('name')
    .limit(6)

  return (
    <>
      <Navbar storeName={store.name} tipoServicio="tienda" />

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen bg-black flex items-center overflow-hidden">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
        {/* Accent glow */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none"
          style={{ backgroundColor: 'var(--color-secondary)', opacity: 0.12 }}
        />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        <div className="relative container-px w-full pt-28 pb-32">
          <div className="max-w-5xl">
            <p className="eyebrow mb-6 animate-fade-in">
              {store.name} — {new Date().getFullYear()}
            </p>
            <h1 className="heading-xl text-white mb-6 animate-fade-up delay-100">
              NUEVA<br />
              <span style={{ color: 'var(--color-secondary)' }}>COLECCIÓN</span>
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-sm mb-10 animate-fade-up delay-200 font-light leading-relaxed">
              {store.tagline}
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-up delay-300">
              <Link href="/productos" className="btn-accent">
                Comprar ahora
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center justify-center border-2 border-white/30 text-white px-8 py-4 text-sm font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all duration-200"
              >
                Ver colección
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-700">
          <div className="w-px h-10 bg-gradient-to-b from-white/0 via-white/40 to-white/0 animate-fade-up delay-700" />
          <span className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-bold">Scroll</span>
        </div>
      </section>

      {/* ─── TICKER ─── */}
      <div className="overflow-hidden bg-[var(--color-secondary)] py-3 select-none">
        <div className="animate-marquee whitespace-nowrap">
          <span className="inline-block text-white text-xs font-bold uppercase tracking-widest">
            {TICKER.repeat(6)}
          </span>
        </div>
      </div>

      {/* ─── CATEGORIES ─── */}
      {categories && categories.length > 0 && (
        <ScrollReveal>
          <section className="section bg-white">
            <div className="container-px">
              <div className="flex items-end justify-between mb-10">
                <div data-reveal data-delay="0">
                  <p className="eyebrow mb-2">Explorar</p>
                  <h2 className="heading-md text-black">Categorías</h2>
                </div>
                <Link
                  href="/productos"
                  data-reveal data-delay="150"
                  className="text-xs font-bold uppercase tracking-widest text-black hover:text-[var(--color-secondary)] transition-colors flex items-center gap-1"
                >
                  Ver todo <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((cat, i) => (
                  <Link
                    key={cat.id}
                    href={`/productos?categoria=${cat.slug}`}
                    data-reveal
                    data-delay={String(i * 70)}
                    className="group relative aspect-square bg-black flex items-end p-5 overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <div
                      className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-300"
                      style={{ backgroundColor: 'var(--color-secondary)' }}
                    />
                    <div className="relative">
                      <h3 className="heading-sm text-white leading-none">{cat.name}</h3>
                      <p className="text-white/40 text-xs uppercase tracking-widest font-bold mt-1 flex items-center gap-1 group-hover:text-white/70 transition-colors">
                        Explorar <ChevronRight size={11} />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* ─── FEATURED PRODUCTS ─── */}
      <ScrollReveal>
        <section className="section bg-gray-50">
          <div className="container-px">
            <div className="flex items-end justify-between mb-10">
              <div data-reveal data-delay="0">
                <p className="eyebrow mb-2">Lo más nuevo</p>
                <h2 className="heading-md text-black">Destacados</h2>
              </div>
              <Link
                href="/productos"
                data-reveal data-delay="150"
                className="text-xs font-bold uppercase tracking-widest text-black hover:text-[var(--color-secondary)] transition-colors flex items-center gap-1"
              >
                Ver todo <ArrowRight size={14} />
              </Link>
            </div>

            {featured && featured.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {(featured as unknown as Product[]).map((product, i) => (
                  <div key={product.id} data-reveal data-delay={String(i * 70)}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-gray-400 mb-6 text-sm uppercase tracking-widest">La tienda está siendo configurada</p>
                <Link href="/admin/productos" className="btn-primary">
                  Agregar productos
                </Link>
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* ─── STORYTELLING ─── */}
      <ScrollReveal>
        <section className="section bg-black overflow-hidden">
          <div className="container-px">
            <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div>
                <p data-reveal="left" data-delay="0" className="eyebrow mb-5">Nuestra filosofía</p>
                <h2 data-reveal="left" data-delay="100" className="heading-lg text-white">
                  HECHO PARA<br />
                  <span style={{ color: 'var(--color-secondary)' }}>LOS QUE SE ATREVEN</span>
                </h2>
                <p data-reveal="left" data-delay="200" className="text-white/45 mt-6 text-base leading-relaxed max-w-sm">
                  Cada pieza está diseñada para quienes no siguen tendencias — las crean. Calidad real, estilo auténtico, identidad propia.
                </p>
                <div data-reveal="left" data-delay="320">
                  <Link href="/productos" className="inline-block mt-10 btn-accent">
                    Descubrir
                  </Link>
                </div>
              </div>

              <div data-reveal="right" data-delay="150">
                <div
                  className="aspect-[4/5] w-full"
                  style={{
                    background: `linear-gradient(145deg, #111 0%, var(--color-secondary) 100%)`,
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── NEWSLETTER ─── */}
      <ScrollReveal>
        <section className="section bg-white border-t border-gray-100">
          <div className="container-px">
            <div data-reveal data-delay="0" className="max-w-xl mx-auto text-center">
              <p className="eyebrow mb-3">Mantente al día</p>
              <h2 className="heading-md text-black mb-4">ÚNETE A LA COMUNIDAD</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Sé el primero en conocer nuevos lanzamientos y descuentos exclusivos.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── FOOTER ─── */}
      <footer className="bg-black text-white">
        <div className="container-px py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <p
                className="heading-sm text-white mb-4 leading-none"
                style={{ fontFamily: 'var(--font-heading, Bebas Neue, sans-serif)' }}
              >
                {store.name}
              </p>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs">{store.tagline}</p>
            </div>

            <div>
              <p className="text-white text-[11px] font-bold uppercase tracking-widest mb-5">Tienda</p>
              <ul className="space-y-3">
                <li>
                  <Link href="/productos" className="text-white/45 text-sm hover:text-white transition-colors">
                    Todos los productos
                  </Link>
                </li>
                {(categories ?? []).slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/productos?categoria=${encodeURIComponent(cat.slug)}`}
                      className="text-white/45 text-sm hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white text-[11px] font-bold uppercase tracking-widest mb-5">Ayuda</p>
              <ul className="space-y-3">
                <li>
                  <Link href="/carrito" className="text-white/45 text-sm hover:text-white transition-colors">
                    Mi carrito
                  </Link>
                </li>
                <li>
                  <Link href="/checkout" className="text-white/45 text-sm hover:text-white transition-colors">
                    Checkout
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-white text-[11px] font-bold uppercase tracking-widest mb-5">Síguenos</p>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-white/45 text-sm hover:text-white transition-colors">TikTok</a>
                </li>
                <li>
                  <a href="#" className="text-white/45 text-sm hover:text-white transition-colors">Instagram</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-xs">
              © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
            </p>
            <p className="text-white/15 text-xs">Powered by EcommerceOS</p>
          </div>
        </div>
      </footer>
    </>
  )
}
