'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ACTIVE_CONFIG } from '@ecommerce/config'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }
    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header minimal */}
      <div className="container-px py-6">
        <Link href="/" className="heading-sm text-white hover:text-[var(--color-secondary)] transition-colors">
          {ACTIVE_CONFIG.store_name}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="eyebrow mb-2">Bienvenido de vuelta</p>
            <h1 className="heading-md text-white">INICIAR SESIÓN</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-sm text-white/60">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="label-sm text-white/60">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full mt-2 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-white/40">
              <Link href="/recuperar" className="text-white/60 hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p className="text-white/40">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-white hover:text-[var(--color-secondary)] font-bold transition-colors">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
