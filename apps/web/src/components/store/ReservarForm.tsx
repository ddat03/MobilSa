'use client'
import { useState } from 'react'
import Link from 'next/link'
import { WhatsAppReservaButton } from '@/components/store/WhatsAppButton'
import { CalendarClock } from 'lucide-react'
import type { StoreConfig } from '@ecommerce/core'

const field = 'w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black'
const label = 'block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5'

export function ReservarForm({ store }: { store: StoreConfig }) {
  const [nombre, setNombre]     = useState('')
  const [telefono, setTelefono] = useState('')
  const [fecha, setFecha]       = useState('')
  const [hora, setHora]         = useState('')
  const [personas, setPersonas] = useState(2)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ referencia: string } | null>(null)

  async function confirmar() {
    setError(null)
    if (!nombre.trim() || !telefono.trim()) { setError('Nombre y teléfono son obligatorios.'); return }
    if (!fecha || !hora) { setError('Elegí fecha y hora.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/reservaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente: { nombre, telefono }, fecha, hora, personas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear la reserva')
      setResultado({ referencia: data.referencia })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (resultado) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="eyebrow mb-2">Reserva registrada</p>
        <h1 className="heading-md text-black mb-2">¡Listo, {nombre.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tu reserva <span className="font-mono font-bold text-black">{resultado.referencia}</span> quedó
          registrada. Avisale al negocio por WhatsApp para que la confirme y te diga el anticipo.
        </p>
        {store.whatsapp_number ? (
          <WhatsAppReservaButton
            number={store.whatsapp_number}
            storeName={store.name}
            referencia={resultado.referencia}
            fecha={fecha}
            hora={hora}
            personas={personas}
          />
        ) : (
          <p className="text-xs text-gray-400">Este negocio todavía no configuró su WhatsApp.</p>
        )}
        <Link href="/menu" className="block mt-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black">
          Volver al menú
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className="mb-6 flex items-center gap-2">
        <CalendarClock size={22} />
        <h1 className="heading-md text-black">Reservar mesa</h1>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className={label}>Nombre *</label>
          <input className={field} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
        </div>
        <div>
          <label className={label}>Teléfono *</label>
          <input className={field} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="09..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Fecha *</label>
            <input type="date" className={field} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label className={label}>Hora *</label>
            <input type="time" className={field} value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={label}>Número de personas *</label>
          <input type="number" min={1} className={field} value={personas}
            onChange={(e) => setPersonas(Math.max(1, parseInt(e.target.value) || 1))} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 mb-4">{error}</p>}

      <button onClick={confirmar} disabled={loading} className="btn-primary w-full disabled:opacity-50">
        {loading ? 'Registrando...' : 'Reservar mesa'}
      </button>
    </div>
  )
}
