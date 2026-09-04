'use client'
import { useState } from 'react'

export function NewsletterForm() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-secondary)]">
        ¡Gracias! Te avisaremos pronto.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        className="input flex-1"
      />
      <button type="submit" className="btn-primary whitespace-nowrap">
        Suscribirme
      </button>
    </form>
  )
}
