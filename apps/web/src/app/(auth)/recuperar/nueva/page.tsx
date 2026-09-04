'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ACTIVE_CONFIG } from '@ecommerce/config'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [ready, setReady]         = useState(false)

  useEffect(() => {
    // Supabase sets the session automatically from the URL hash after reset
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/login?reset=1')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="container-px py-6">
        <Link href="/" className="heading-sm text-white hover:text-[var(--color-secondary)] transition-colors">
          {ACTIVE_CONFIG.store_name}
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="eyebrow mb-2">Nueva contraseña</p>
            <h1 className="heading-md text-white">CREAR CONTRASEÑA</h1>
          </div>
          {!ready ? (
            <p className="text-white/40 text-sm">Verificando enlace...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-sm text-white/60">Nueva contraseña</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                  placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="label-sm text-white/60">Confirmar contraseña</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white"
                  placeholder="Repite la contraseña" />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading} className="btn-accent w-full disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
