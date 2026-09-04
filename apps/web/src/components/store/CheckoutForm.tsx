'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import { ACTIVE_CONFIG } from '@ecommerce/config'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, CreditCard, Smartphone, Building2, ChevronRight, ArrowLeft, Upload, CheckCircle2 } from 'lucide-react'

interface StoreConfig {
  whatsapp_number: string | null
  bank_name: string | null
  bank_account: string | null
  bank_holder: string | null
  bank_id: string | null
  deuna_qr_url: string | null
  deuna_phone: string | null
  currency: string | null
}

interface CheckoutFormProps {
  storeConfig: StoreConfig | null
}

type PaymentMethod = 'card' | 'deuna' | 'transfer'
type Step = 'shipping' | 'payment'

export function CheckoutForm({ storeConfig }: CheckoutFormProps) {
  const { items, total, clear: clearCart } = useCartStore()
  const router   = useRouter()
  const cartTotal  = total()
  const shipping   = ACTIVE_CONFIG.shipping_flat_rate ?? 0
  const orderTotal = cartTotal + shipping
  const currency   = storeConfig?.currency ?? ACTIVE_CONFIG.currency

  const [step, setStep]             = useState<Step>('shipping')
  const [payMethod, setPayMethod]   = useState<PaymentMethod>('card')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [uploadingComprobante, setUploadingComprobante] = useState(false)

  const [form, setForm] = useState({
    full_name: '', phone: '', street: '', city: '', province: '', country: 'Ecuador',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function goToPayment() {
    if (!form.full_name || !form.street || !form.city) {
      setError('Nombre, dirección y ciudad son obligatorios.')
      return
    }
    setError(null)
    setStep('payment')
  }

  /* ── Pago con Stripe ── */
  async function handleCardPayment() {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shippingAddress: form, userId: user?.id ?? null }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error al crear sesión de pago')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  /* ── Pago manual (De Una / Transferencia) ── */
  async function handleManualPayment() {
    if (!comprobante) {
      setError('Subí una foto o captura del comprobante para poder confirmar el pedido.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1) Subir el comprobante
      setUploadingComprobante(true)
      const fd = new FormData()
      fd.append('file', comprobante)
      const upRes = await fetch('/api/comprobantes', { method: 'POST', body: fd })
      const upData = await upRes.json()
      setUploadingComprobante(false)
      if (!upRes.ok) throw new Error(upData.error ?? 'No se pudo subir el comprobante')

      // 2) Crear el pedido con la referencia del comprobante
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch('/api/checkout/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: form,
          userId: user?.id ?? null,
          paymentMethod: payMethod,
          subtotal: cartTotal,
          shipping,
          total: orderTotal,
          comprobanteUrl: upData.path,
          channel: 'web',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el pedido')

      clearCart()
      router.push(`/checkout/pendiente?order=${data.orderNumber}&method=${payMethod}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
      setUploadingComprobante(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-6">Tu carrito está vacío</p>
          <Link href="/productos" className="btn-primary">Ver productos</Link>
        </div>
      </div>
    )
  }

  const hasDeuna    = !!(storeConfig?.deuna_phone || storeConfig?.deuna_qr_url)
  const hasTransfer = !!storeConfig?.bank_account

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container-px py-10 max-w-4xl">

        {/* Breadcrumb steps */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => { if (step === 'payment') { setStep('shipping'); setError(null) } }}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              step === 'shipping' ? 'text-black' : 'text-gray-400 hover:text-black'
            }`}
          >
            {step === 'payment' && <ArrowLeft size={14} />}
            1. Envío
          </button>
          <ChevronRight size={14} className="text-gray-300" />
          <span className={`text-xs font-bold uppercase tracking-widest ${step === 'payment' ? 'text-black' : 'text-gray-300'}`}>
            2. Pago
          </span>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">

          {/* ── Columna izquierda ── */}
          <div className="lg:col-span-3">

            {/* STEP 1: Dirección */}
            {step === 'shipping' && (
              <div className="bg-white border border-gray-100 p-6">
                <h2 className="heading-sm text-black mb-6">Dirección de envío</h2>
                <div className="space-y-4">
                  <div>
                    <label className="label-sm">Nombre completo *</label>
                    <input name="full_name" value={form.full_name} onChange={handleChange}
                      className="input" placeholder="María García" />
                  </div>
                  <div>
                    <label className="label-sm">Teléfono</label>
                    <input name="phone" value={form.phone} onChange={handleChange}
                      className="input" placeholder="+593 99 999 9999" />
                  </div>
                  <div>
                    <label className="label-sm">Dirección *</label>
                    <input name="street" value={form.street} onChange={handleChange}
                      className="input" placeholder="Calle y número" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-sm">Ciudad *</label>
                      <input name="city" value={form.city} onChange={handleChange}
                        className="input" placeholder="Quito" />
                    </div>
                    <div>
                      <label className="label-sm">Provincia</label>
                      <input name="province" value={form.province} onChange={handleChange}
                        className="input" placeholder="Pichincha" />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3">{error}</p>}

                  <button onClick={goToPayment} className="btn-primary w-full mt-2">
                    Continuar al pago
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Método de pago */}
            {step === 'payment' && (
              <div className="space-y-3">
                <h2 className="heading-sm text-black mb-4">Método de pago</h2>

                {/* Tarjeta */}
                <label className={`flex items-start gap-4 p-5 bg-white border-2 cursor-pointer transition-colors ${payMethod === 'card' ? 'border-black' : 'border-gray-100 hover:border-gray-300'}`}>
                  <input type="radio" name="pay" value="card" checked={payMethod === 'card'} onChange={() => setPayMethod('card')} className="mt-0.5" />
                  <CreditCard size={22} className="shrink-0 mt-0.5 text-gray-600" />
                  <div>
                    <p className="font-bold text-black text-sm uppercase tracking-wide">Tarjeta de crédito / débito</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pago seguro con Stripe. Visa, Mastercard, Amex.</p>
                  </div>
                </label>

                {/* De Una */}
                {hasDeuna && (
                  <label className={`flex items-start gap-4 p-5 bg-white border-2 cursor-pointer transition-colors ${payMethod === 'deuna' ? 'border-black' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input type="radio" name="pay" value="deuna" checked={payMethod === 'deuna'} onChange={() => setPayMethod('deuna')} className="mt-0.5" />
                    <Smartphone size={22} className="shrink-0 mt-0.5 text-gray-600" />
                    <div>
                      <p className="font-bold text-black text-sm uppercase tracking-wide">De Una</p>
                      <p className="text-xs text-gray-400 mt-0.5">Escanea el QR o transfiere al número registrado.</p>
                    </div>
                  </label>
                )}

                {/* Transferencia */}
                {hasTransfer && (
                  <label className={`flex items-start gap-4 p-5 bg-white border-2 cursor-pointer transition-colors ${payMethod === 'transfer' ? 'border-black' : 'border-gray-100 hover:border-gray-300'}`}>
                    <input type="radio" name="pay" value="transfer" checked={payMethod === 'transfer'} onChange={() => setPayMethod('transfer')} className="mt-0.5" />
                    <Building2 size={22} className="shrink-0 mt-0.5 text-gray-600" />
                    <div>
                      <p className="font-bold text-black text-sm uppercase tracking-wide">Transferencia bancaria</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {storeConfig?.bank_name} · Cta: {storeConfig?.bank_account}
                      </p>
                    </div>
                  </label>
                )}

                {/* Detalle De Una (cuando está seleccionado) */}
                {payMethod === 'deuna' && hasDeuna && (
                  <div className="bg-white border border-gray-100 p-5 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Datos De Una</p>
                    {storeConfig?.deuna_qr_url && (
                      <div className="flex justify-center">
                        <Image src={storeConfig.deuna_qr_url} alt="QR De Una" width={180} height={180} className="border border-gray-100" />
                      </div>
                    )}
                    {storeConfig?.deuna_phone && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Número</p>
                        <p className="text-xl font-bold text-black font-mono">{storeConfig.deuna_phone}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center">
                      Subí la foto o captura del comprobante abajo para confirmar el pedido.
                    </p>
                  </div>
                )}

                {/* Detalle Transferencia (cuando está seleccionado) */}
                {payMethod === 'transfer' && hasTransfer && (
                  <div className="bg-white border border-gray-100 p-5 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Datos bancarios</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {storeConfig?.bank_name && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Banco</p>
                          <p className="font-bold text-black mt-0.5">{storeConfig.bank_name}</p>
                        </div>
                      )}
                      {storeConfig?.bank_account && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Cuenta</p>
                          <p className="font-bold text-black mt-0.5 font-mono">{storeConfig.bank_account}</p>
                        </div>
                      )}
                      {storeConfig?.bank_holder && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Titular</p>
                          <p className="font-bold text-black mt-0.5">{storeConfig.bank_holder}</p>
                        </div>
                      )}
                      {storeConfig?.bank_id && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Cédula</p>
                          <p className="font-bold text-black mt-0.5 font-mono">{storeConfig.bank_id}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Subí la foto o captura del comprobante abajo para confirmar el pedido.
                    </p>
                  </div>
                )}

                {/* Subida de comprobante — solo para pago manual */}
                {payMethod !== 'card' && (
                  <div className="bg-white border border-gray-100 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Comprobante de pago</p>
                    <label className={`flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-4 cursor-pointer transition-colors ${
                      comprobante ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-400'
                    }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                      />
                      {comprobante ? (
                        <>
                          <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{comprobante.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-500">Tocá para tomar una foto o subir el comprobante</span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3">{error}</p>}

                {/* Botón de pago */}
                {payMethod === 'card' ? (
                  <button onClick={handleCardPayment} disabled={loading} className="btn-accent w-full disabled:opacity-50">
                    {loading ? 'Redirigiendo...' : `Pagar ${formatPrice(orderTotal, currency)} con tarjeta`}
                  </button>
                ) : (
                  <button onClick={handleManualPayment} disabled={loading || !comprobante} className="btn-primary w-full disabled:opacity-50">
                    {loading ? (uploadingComprobante ? 'Subiendo comprobante...' : 'Creando pedido...') : `Confirmar pedido · ${formatPrice(orderTotal, currency)}`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Resumen ── */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Resumen del pedido</h2>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.variantId} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.productName} × {item.quantity}</span>
                    <span className="font-bold shrink-0">{formatPrice(item.unitPrice * item.quantity, currency)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Envío</span>
                  <span>{shipping === 0 ? 'Gratis' : formatPrice(shipping, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-black text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(orderTotal, currency)}</span>
                </div>
              </div>

              {/* Dirección confirmada */}
              {step === 'payment' && form.full_name && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Enviar a</p>
                  <p className="text-sm text-gray-700 font-medium">{form.full_name}</p>
                  <p className="text-xs text-gray-400">{form.street}, {form.city}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
