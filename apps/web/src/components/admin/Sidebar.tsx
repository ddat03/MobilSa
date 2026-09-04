'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Boxes, Settings, LogOut, Store, UtensilsCrossed, CalendarClock, CreditCard
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_TIENDA = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/productos',  label: 'Productos',  icon: Package },
  { href: '/admin/pedidos',    label: 'Pedidos',    icon: ShoppingBag },
  { href: '/admin/pagos',      label: 'Pagos',      icon: CreditCard },
  { href: '/admin/clientes',   label: 'Clientes',   icon: Users },
  { href: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

const NAV_RESTAURANTE = [
  { href: '/admin',            label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/admin/menu',       label: 'Menú',            icon: UtensilsCrossed },
  { href: '/admin/pedidos',    label: 'Pedidos y reservas', icon: CalendarClock },
  { href: '/admin/pagos',      label: 'Pagos',           icon: CreditCard },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar({
  storeName, tipoServicio, isSuperAdmin,
}: { storeName: string; tipoServicio?: 'tienda' | 'restaurante'; isSuperAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const NAV = tipoServicio === 'restaurante' ? NAV_RESTAURANTE : NAV_TIENDA

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 min-h-screen bg-[var(--color-primary)] text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-xs font-medium opacity-60 uppercase tracking-widest mb-1">Panel del negocio</p>
        <p className="font-bold text-lg leading-tight">{storeName}</p>
        {isSuperAdmin && (
          <Link href="/superadmin" className="text-[11px] text-white/50 hover:text-white transition-colors">
            ← Todos los negocios
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Store size={17} />
          Ver tienda
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
