import Link from 'next/link'
import { crearNegocio } from '../actions'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const field = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]'
const label = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

export default function NuevoNegocioPage() {
  return (
    <div className="max-w-lg">
      <Link href="/superadmin" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={14} /> Volver
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nuevo negocio</h1>
      <p className="text-sm text-gray-500 mb-6">
        Se crea en estado <strong>prueba</strong>. Después podés activarlo desde la lista.
      </p>

      <form action={crearNegocio} className="space-y-4 bg-white border border-gray-100 rounded-xl p-6">
        <div>
          <label className={label}>Nombre del negocio *</label>
          <input name="name" required className={field} placeholder="Pizzería Luigi" />
        </div>
        <div>
          <label className={label}>Subdominio</label>
          <input name="slug" className={field} placeholder="pizzeria-luigi" />
          <p className="text-xs text-gray-400 mt-1">Su sitio será <code>&lt;subdominio&gt;.tudominio.com</code>. Si lo dejás vacío se genera del nombre.</p>
        </div>
        <div>
          <label className={label}>Tipo de servicio *</label>
          <select name="tipo_servicio" className={field} defaultValue="tienda">
            <option value="tienda">Tienda (productos)</option>
            <option value="restaurante">Restaurante (menú, reservas, delivery)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Color primario</label>
            <input name="primary_color" type="color" defaultValue="#1E3A5F" className="w-full h-10 border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className={label}>Color secundario</label>
            <input name="secondary_color" type="color" defaultValue="#e94560" className="w-full h-10 border border-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Moneda</label>
            <input name="currency" className={field} defaultValue="USD" />
          </div>
          <div>
            <label className={label}>Chat Telegram para alertas</label>
            <input name="telegram_chat_id_alertas" className={field} placeholder="-100123456789" />
          </div>
        </div>

        <button type="submit" className="w-full bg-[#1E3A5F] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#16304d]">
          Crear negocio
        </button>
      </form>
    </div>
  )
}
