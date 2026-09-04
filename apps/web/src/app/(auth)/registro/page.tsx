'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ACTIVE_CONFIG } from '@ecommerce/config'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      const msg = error.message && error.message !== '{}'
        ? error.message
        : 'Error al registrarse. Intenta de nuevo.'
      setMessage({ type: 'error', text: msg })
      setLoading(false)
      return
    }
    setMessage({ type: 'success', text: '¡Listo! Revisa tu email para confirmar tu cuenta.' })
    setLoading(false)
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
            <p className="eyebrow mb-2">Únete</p>
            <h1 className="heading-md text-white">CREAR CUENTA</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-sm text-white/60">Nombre completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                placeholder="Tu nombre"
              />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {message && (
              <p className={`text-sm px-4 py-3 border ${
                message.type === 'success'
                  ? 'text-green-400 bg-green-900/20 border-green-800'
                  : 'text-red-400 bg-red-900/20 border-red-800'
              }`}>
                {message.text}
              </p>
            )}

            {!message?.type || message.type === 'error' ? (
              <button type="submit" disabled={loading} className="btn-accent w-full mt-2 disabled:opacity-50">
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            ) : (
              <Link href="/login" className="btn-primary w-full mt-2 text-center block">
                Iniciar sesión
              </Link>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-white hover:text-[var(--color-secondary)] font-bold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
