'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { updateStoreConfig } from '@/app/admin/actions/config'

interface ConfigFormProps {
  store: {
    name: string
    primary_color: string
    secondary_color: string
    logo_url: string | null
    currency: string
    slug: string
    whatsapp_number: string | null
    instagram_url: string | null
    tiktok_url: string | null
  } | null
}

export function ConfigForm({ store }: ConfigFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [primary, setPrimary]   = useState(store?.primary_color   ?? '#1a1a2e')
  const [secondary, setSecondary] = useState(store?.secondary_color ?? '#e94560')

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const fd = new FormData(formRef.current!)
      fd.set('primary_color', primary)
      fd.set('secondary_color', secondary)
      await updateStoreConfig(fd)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">

      {/* Identidad */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Identidad</h3>

        <div>
          <label className="label-sm">Nombre de la tienda *</label>
          <input name="name" required defaultValue={store?.name}
            className="input mt-1" placeholder="Mi Tienda" />
        </div>

        <div>
          <label className="label-sm">URL del logo</label>
          <input name="logo_url" defaultValue={store?.logo_url ?? ''}
            className="input mt-1" placeholder="https://... (deja vacío para usar el nombre)" />
          <p className="text-xs text-gray-400 mt-1">Pega la URL de tu logo subido a Supabase Storage u otro servicio.</p>
        </div>

        <div>
          <label className="label-sm">Moneda</label>
          <select name="currency" defaultValue={store?.currency ?? 'USD'} className="input mt-1">
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="COP">COP — Peso colombiano</option>
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="PEN">PEN — Sol peruano</option>
          </select>
        </div>
      </div>

      {/* Contacto y redes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Contacto y redes sociales</h3>

        <div>
          <label className="label-sm">Número de WhatsApp Business</label>
          <input name="whatsapp_number" defaultValue={store?.whatsapp_number ?? ''}
            className="input mt-1" placeholder="593999999999 (con código de país, sin + ni espacios)" />
          <p className="text-xs text-gray-400 mt-1">Ejemplo Ecuador: 593999999999. Los clientes podrán escribirte directamente.</p>
        </div>

        <div>
          <label className="label-sm">Instagram (URL completa)</label>
          <input name="instagram_url" defaultValue={store?.instagram_url ?? ''}
            className="input mt-1" placeholder="https://instagram.com/tu_tienda" />
        </div>

        <div>
          <label className="label-sm">TikTok (URL completa)</label>
          <input name="tiktok_url" defaultValue={store?.tiktok_url ?? ''}
            className="input mt-1" placeholder="https://tiktok.com/@tu_tienda" />
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Métodos de pago manuales</h3>
        <p className="text-xs text-gray-400">Configura los datos que verán los clientes al elegir pagar por De Una o transferencia.</p>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">📱 De Una</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Número De Una</label>
              <input name="deuna_phone" defaultValue={(store as any)?.deuna_phone ?? ''}
                className="input mt-1" placeholder="0999999999" />
            </div>
            <div>
              <label className="label-sm">URL imagen QR</label>
              <input name="deuna_qr_url" defaultValue={(store as any)?.deuna_qr_url ?? ''}
                className="input mt-1" placeholder="https://..." />
              <p className="text-xs text-gray-400 mt-1">Sube tu QR a Supabase Storage y pega la URL aquí.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">🏦 Transferencia bancaria</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Nombre del banco</label>
              <input name="bank_name" defaultValue={(store as any)?.bank_name ?? ''}
                className="input mt-1" placeholder="Banco Pichincha" />
            </div>
            <div>
              <label className="label-sm">Número de cuenta</label>
              <input name="bank_account" defaultValue={(store as any)?.bank_account ?? ''}
                className="input mt-1" placeholder="2200123456" />
            </div>
            <div>
              <label className="label-sm">Nombre del titular</label>
              <input name="bank_holder" defaultValue={(store as any)?.bank_holder ?? ''}
                className="input mt-1" placeholder="María García" />
            </div>
            <div>
              <label className="label-sm">Cédula del titular</label>
              <input name="bank_id" defaultValue={(store as any)?.bank_id ?? ''}
                className="input mt-1" placeholder="1712345678" />
            </div>
          </div>
        </div>
      </div>

      {/* Colores */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Colores de la marca</h3>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="label-sm mb-2 block">Color primario</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
              <div>
                <p className="text-sm font-mono text-gray-700">{primary}</p>
                <p className="text-xs text-gray-400">Navbar, botones</p>
              </div>
            </div>
          </div>

          <div>
            <label className="label-sm mb-2 block">Color secundario</label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200 p-0.5" />
              <div>
                <p className="text-sm font-mono text-gray-700">{secondary}</p>
                <p className="text-xs text-gray-400">Badges, acentos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg overflow-hidden border border-gray-100 mt-2">
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: primary }}>
            <span className="text-white font-bold text-sm">Vista previa Navbar</span>
            <span className="ml-auto text-white text-xs opacity-70">Carrito (0)</span>
          </div>
          <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded text-white font-semibold"
              style={{ backgroundColor: secondary }}>-20%</span>
            <span className="text-sm font-semibold" style={{ color: primary }}>$25.00</span>
            <span className="ml-auto px-3 py-1 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: primary }}>Agregar al carrito</span>
          </div>
        </div>
      </div>

      {/* Estado */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✓ Configuración guardada. Recarga la tienda para ver los cambios.
        </div>
      )}

      <Button type="button" size="lg" loading={loading} onClick={handleSave}>
        Guardar configuración
      </Button>
    </form>
  )
}
