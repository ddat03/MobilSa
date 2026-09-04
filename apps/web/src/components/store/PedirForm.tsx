'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMenuCartStore } from '@/store/menuCart'
import { formatPrice } from '@/lib/utils'
import { WhatsAppPedidoConfirmadoButton } from '@/components/store/WhatsAppButton'
import { Store, Bike, ShoppingBag } from 'lucide-react'
import type { StoreConfig } from '@ecommerce/core'

type Modalidad = 'recoger' | 'domicilio'

const field = 'w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black'
const label = 'block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5'

export function PedirForm({ store }: { store: StoreConfig }) {
  const router = useRouter()
  const { items, total, clear } = useMenuCartStore()
  const cartTotal = total()

  const [modalidad, setModalidad] = useState<Modalidad>('recoger')
  const [nombre, setNombre]       = useState('')
  const [telefono, setTelefono]   = useState('')
  const [direccion, setDireccion] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ referencia: string; total: number } | null>(null)
  const [itemsEnviados, setItemsEnviados] = useState<typeof items>([])

  const envio = modalidad === 'domicilio' ? Number(store.shipping_flat_rate ?? 0) : 0
  const totalFinal = cartTotal + envio

  async function confirmar() {
    setError(null)
    if (!nombre.trim() || !telefono.trim()) { setError('Nombre y teléfono son obligatorios.'); return }
    if (modalidad === 'domicilio' && !direccion.trim()) { setError('Falta la dirección de entrega.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/pedidos-restaurante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ platoId: i.platoId, nombre: i.nombre, precio: i.precio, cantidad: i.quantity })),
          modalidad,
          cliente: { nombre, telefono, direccion: modalidad === 'domicilio' ? direccion : undefined },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear el pedido')
      setItemsEnviados(items)
      setResultado({ referencia: data.referencia, total: data.total })
      clear()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && !resultado) {
    return (
      <div className="py-24 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium mb-4">Tu pedido está vacío.</p>
        <Link href="/menu" className="btn-primary">Ver menú</Link>
      </div>
    )
  }

  if (resultado) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="eyebrow mb-2">Pedido registrado</p>
        <h1 className="heading-md text-black mb-2">¡Listo, {nombre.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tu pedido <span className="font-mono font-bold text-black">{resultado.referencia}</span> quedó
          registrado por {formatPrice(resultado.total, store.currency)}. Avisale al negocio por WhatsApp
          para coordinar el pago.
        </p>
        {store.whatsapp_number ? (
          <WhatsAppPedidoConfirmadoButton
            number={store.whatsapp_number}
            storeName={store.name}
            referencia={resultado.referencia}
            items={itemsEnviados.map((i) => ({ nombre: i.nombre, cantidad: i.quantity, precio: i.precio }))}
            modalidad={modalidad}
            direccion={direccion}
            total={resultado.total}
            currency={store.currency}
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
      <h1 className="heading-md text-black mb-6">Confirmar pedido</h1>

      {/* Resumen */}
      <div className="bg-white border border-gray-100 p-5 mb-6">
        {items.map((i) => (
          <div key={i.platoId} className="flex justify-between text-sm py-1">
            <span className="text-gray-600">{i.quantity}× {i.nombre}</span>
            <span className="font-medium">{formatPrice(i.precio * i.quantity, store.currency)}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{formatPrice(cartTotal, store.currency)}</span>
          </div>
          {modalidad === 'domicilio' && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Envío</span><span>{envio === 0 ? 'A coordinar' : formatPrice(envio, store.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-black pt-1">
            <span>Total</span><span>{formatPrice(totalFinal, store.currency)}</span>
          </div>
        </div>
      </div>

      {/* Modalidad */}
      <div className="mb-5">
        <label className={label}>¿Cómo lo querés?</label>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setModalidad('recoger')}
            className={`flex items-center gap-2 justify-center border-2 py-3 text-sm font-bold ${modalidad === 'recoger' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}>
            <Store size={16} /> Recoger
          </button>
          <button onClick={() => setModalidad('domicilio')}
            className={`flex items-center gap-2 justify-center border-2 py-3 text-sm font-bold ${modalidad === 'domicilio' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500'}`}>
            <Bike size={16} /> Domicilio
          </button>
        </div>
      </div>

      {/* Datos */}
      <div className="space-y-4 mb-6">
        <div>
          <label className={label}>Nombre *</label>
          <input className={field} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
        </div>
        <div>
          <label className={label}>Teléfono *</label>
          <input className={field} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="09..." />
        </div>
        {modalidad === 'domicilio' && (
          <div>
            <label className={label}>Dirección de entrega *</label>
            <input className={field} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, referencia" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 mb-4">{error}</p>}

      <button onClick={confirmar} disabled={loading} className="btn-primary w-full disabled:opacity-50">
        {loading ? 'Registrando...' : `Confirmar pedido · ${formatPrice(totalFinal, store.currency)}`}
      </button>
    </div>
  )
}
