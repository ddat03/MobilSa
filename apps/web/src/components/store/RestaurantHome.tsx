import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Navbar } from '@/components/store/Navbar'
import { MenuItemCard } from '@/components/store/MenuItemCard'
import type { StoreConfig, MenuPlato } from '@ecommerce/core'
import { ArrowRight } from 'lucide-react'

/**
 * Landing pública para negocios con tipo_servicio = 'restaurante'.
 * A propósito mucho más simple que la de tienda (sin storytelling/newsletter):
 * nombre + tagline + CTA al menú + una vidriera de unos pocos platos.
 */
export async function RestaurantHome({ store }: { store: StoreConfig }) {
  const supabase = createAdminClient()
  const { data: platos } = await supabase
    .from('menu_platos')
    .select('*')
    .eq('store_id', store.id)
    .eq('disponible', true)
    .order('orden')
    .limit(8)

  return (
    <>
      <Navbar storeName={store.name} tipoServicio="restaurante" />

      {/* ─── HERO ─── */}
      <section className="relative min-h-[70vh] bg-black flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none"
          style={{ backgroundColor: 'var(--color-secondary)', opacity: 0.15 }}
        />
        <div className="relative container-px w-full pt-24 pb-20">
          <p className="eyebrow mb-4">Menú digital</p>
          <h1 className="heading-xl text-white mb-4">{store.name}</h1>
          {store.tagline && <p className="text-white/55 text-base md:text-lg max-w-md mb-8">{store.tagline}</p>}
          <div className="flex flex-wrap gap-3">
            <Link href="/menu" className="btn-accent inline-flex items-center gap-2">
              Ver el menú <ArrowRight size={16} />
            </Link>
            <Link href="/reservar" className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:border-white transition-all duration-200">
              Reservar mesa
            </Link>
          </div>
        </div>
      </section>

      {/* ─── VIDRIERA ─── */}
      {platos && platos.length > 0 && (
        <section className="section bg-white">
          <div className="container-px">
            <div className="flex items-end justify-between mb-8">
              <h2 className="heading-md text-black">Algunos platos</h2>
              <Link href="/menu" className="text-xs font-bold uppercase tracking-widest text-black hover:text-[var(--color-secondary)] flex items-center gap-1">
                Ver todo <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {(platos as MenuPlato[]).map((plato) => (
                <MenuItemCard key={plato.id} plato={plato} currency={store.currency} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-black text-white">
        <div className="container-px py-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
          {store.whatsapp_number && (
            <a href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
              className="text-white/40 hover:text-[#25D366] text-xs font-bold uppercase tracking-widest transition-colors">
              Escribinos por WhatsApp
            </a>
          )}
        </div>
      </footer>
    </>
  )
}
