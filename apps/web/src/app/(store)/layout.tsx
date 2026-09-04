import { Navbar } from '@/components/store/Navbar'
import { getStore } from '@/lib/store'
import Link from 'next/link'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore()
  const cfg = store
  const storeName = store?.name ?? 'Tienda'

  return (
    <>
      <Navbar storeName={storeName} tipoServicio={store?.tipo_servicio} />
      <main className="pt-20 min-h-screen">
        {children}
      </main>

      <footer className="bg-black text-white">
        <div className="container-px py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            {/* Brand */}
            <div>
              <p className="text-white text-2xl font-black uppercase tracking-widest mb-3"
                style={{ fontFamily: 'var(--font-heading, Bebas Neue, sans-serif)' }}>
                {storeName}
              </p>
              <p className="text-white/30 text-xs leading-relaxed">
                Moda que te define. Calidad que se nota.
              </p>
              {/* Socials */}
              <div className="flex gap-4 mt-4">
                {cfg?.instagram_url && (
                  <a href={cfg.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase">
                    Instagram
                  </a>
                )}
                {cfg?.tiktok_url && (
                  <a href={cfg.tiktok_url} target="_blank" rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase">
                    TikTok
                  </a>
                )}
                {cfg?.whatsapp_number && (
                  <a href={`https://wa.me/${cfg.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
                    className="text-white/40 hover:text-[#25D366] transition-colors text-sm font-bold tracking-widest uppercase">
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Links tienda */}
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                {store?.tipo_servicio === 'restaurante' ? 'Restaurante' : 'Tienda'}
              </p>
              <ul className="space-y-2">
                {(store?.tipo_servicio === 'restaurante'
                  ? [
                      { href: '/menu',     label: 'Ver menú' },
                      { href: '/reservar', label: 'Reservar mesa' },
                      { href: '/carrito',  label: 'Mi pedido' },
                    ]
                  : [
                      { href: '/productos', label: 'Todos los productos' },
                      { href: '/carrito',   label: 'Mi carrito' },
                      { href: '/cuenta',    label: 'Mi cuenta' },
                      { href: '/cuenta/pedidos', label: 'Mis pedidos' },
                    ]
                ).map(l => (
                  <li key={l.href}>
                    <Link href={l.href}
                      className="text-white/40 hover:text-white text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Contacto</p>
              <ul className="space-y-2">
                {cfg?.whatsapp_number && (
                  <li>
                    <a href={`https://wa.me/${cfg.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-white text-sm transition-colors">
                      💬 WhatsApp
                    </a>
                  </li>
                )}
                {cfg?.instagram_url && (
                  <li>
                    <a href={cfg.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-white text-sm transition-colors">
                      📸 Instagram
                    </a>
                  </li>
                )}
                {cfg?.tiktok_url && (
                  <li>
                    <a href={cfg.tiktok_url} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-white text-sm transition-colors">
                      🎵 TikTok
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
            </p>
            <p className="text-white/20 text-xs">Ecuador 🇪🇨</p>
          </div>
        </div>
      </footer>
    </>
  )
}
