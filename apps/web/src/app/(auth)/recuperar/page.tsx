'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useStoreName } from '@/lib/useStoreName'

export default function RecuperarPage() {
  const storeName = useStoreName()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/nueva`,
    })
    setLoading(false)
    if (error) { setError('No pudimos enviar el email. Verifica que sea correcto.'); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="container-px py-6">
        <Link href="/" className="heading-sm text-white hover:text-[var(--color-secondary)] transition-colors">
          {storeName}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <p className="text-5xl mb-6">📧</p>
              <h1 className="heading-md text-white mb-4">Revisa tu email</h1>
              <p className="text-white/50 text-sm mb-8">
                Te enviamos un enlace para restablecer tu contraseña a <strong className="text-white">{email}</strong>.
              </p>
              <Link href="/login" className="btn-accent inline-block">Volver al login</Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="eyebrow mb-2">Recuperar acceso</p>
                <h1 className="heading-md text-white">OLVIDÉ MI CONTRASEÑA</h1>
                <p className="text-white/40 text-sm mt-3">
                  Ingresa tu email y te enviamos un enlace para crear una nueva contraseña.
                </p>
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

                {error && (
                  <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 px-4 py-3">{error}</p>
                )}

                <button type="submit" disabled={loading} className="btn-accent w-full mt-2 disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/40">
                <Link href="/login" className="text-white hover:text-[var(--color-secondary)] transition-colors">
                  ← Volver al login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
