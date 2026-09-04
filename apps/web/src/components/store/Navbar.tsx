'use client'
import Link from 'next/link'
import { ShoppingCart, User, ChevronDown, LayoutDashboard } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cart'
import { useMenuCartStore } from '@/store/menuCart'
import { ACTIVE_CONFIG } from '@ecommerce/config'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface NavbarProps {
  storeName?: string
  tipoServicio?: 'tienda' | 'restaurante'
  categorias?: { slug: string; nombre: string }[]
}

export function Navbar({ storeName, tipoServicio = 'tienda', categorias = [] }: NavbarProps) {
  const [scrolled, setScrolled]       = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [user, setUser]               = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin]         = useState(false)
  const accountRef                    = useRef<HTMLDivElement>(null)
  const esRestaurante = tipoServicio === 'restaurante'
  const tiendaCount = useCartStore((s) => s.itemCount())
  const menuCount = useMenuCartStore((s) => s.itemCount())
  const itemCount = esRestaurante ? menuCount : tiendaCount

  // Auth state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null)
      if (data.user) checkAdmin()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkAdmin()
      else setIsAdmin(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAdmin() {
    try {
      const res = await fetch('/api/me')
      const json = await res.json()
      setIsAdmin(json.isAdmin === true)
    } catch {
      setIsAdmin(false)
    }
  }

  // Scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Body lock on mobile menu
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setAccountOpen(false)
    window.location.href = '/'
  }

  const navLinks = esRestaurante
    ? [
        { href: '/menu', label: 'Menú' },
        ...categorias.map((cat) => ({ href: `/menu?categoria=${cat.slug}`, label: cat.nombre })),
        { href: '/reservar', label: 'Reservar mesa' },
      ]
    : [
        { href: '/productos', label: 'Todos' },
        ...ACTIVE_CONFIG.default_categories.map((cat) => ({
          href: `/productos?categoria=${encodeURIComponent(cat.toLowerCase())}`,
          label: cat,
        })),
      ]

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Mi cuenta'

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen ? 'bg-black' : 'bg-transparent'
        }`}
      >
        <div className="container-px h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="heading-sm text-white z-10 leading-none hover:text-[var(--color-secondary)] transition-colors"
          >
            {storeName ?? ACTIVE_CONFIG.store_name}
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4 z-10">
            {/* Carrito */}
            <Link
              href="/carrito"
              className="relative text-white hover:text-[var(--color-secondary)] transition-colors"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-[var(--color-secondary)] text-white text-[9px] flex items-center justify-center font-bold leading-none">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Auth — desktop */}
            <div className="hidden md:block" ref={accountRef}>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setAccountOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    <User size={16} />
                    {displayName}
                    <ChevronDown size={12} className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-3 w-48 bg-white shadow-xl border border-gray-100 py-1 z-50">
                      {isAdmin && (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-black hover:bg-gray-50 uppercase tracking-wide"
                          >
                            <LayoutDashboard size={14} />
                            Panel Admin
                          </Link>
                          <div className="border-t border-gray-100 my-1" />
                        </>
                      )}
                      <Link
                        href="/cuenta"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Mi perfil
                      </Link>
                      <Link
                        href="/cuenta/pedidos"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        Mis pedidos
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 font-medium"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <User size={16} />
                  Iniciar sesión
                </Link>
              )}
            </div>

            {/* Hamburger mobile */}
            <button
              className="md:hidden relative flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menú"
            >
              <span className={`block h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? 'w-6 rotate-45 translate-y-[7px]' : 'w-6'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'w-0 opacity-0' : 'w-5'}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? 'w-6 -rotate-45 -translate-y-[7px]' : 'w-6'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-black flex flex-col justify-center px-8 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col gap-2">
          {navLinks.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="heading-lg text-white hover:text-[var(--color-secondary)] transition-colors py-1"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col gap-4">
          {user ? (
            <>
              <Link href="/cuenta/pedidos" onClick={() => setMenuOpen(false)} className="text-white/60 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
                Mis pedidos
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-white/60 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
                  Panel admin
                </Link>
              )}
              <button onClick={handleLogout} className="text-left text-white/40 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-white/60 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
              Iniciar sesión
            </Link>
          )}
          <Link href="/carrito" onClick={() => setMenuOpen(false)} className="text-white/40 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
            Carrito{itemCount > 0 ? ` (${itemCount})` : ''}
          </Link>
        </div>
      </div>
    </>
  )
}
