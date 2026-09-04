import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/Badge'
import { cambiarEstado, administrarNegocio } from './actions'
import { Store, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ESTADO_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  prueba: 'warning', activo: 'success', suspendido: 'error',
}

export default async function SuperAdminPage() {
  const admin = createAdminClient()
  const { data: negocios } = await admin
    .from('store_config')
    .select('id, name, slug, tipo_servicio, estado, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negocios</h1>
          <p className="text-sm text-gray-500">{negocios?.length ?? 0} en la plataforma</p>
        </div>
        <Link href="/superadmin/nuevo"
          className="inline-flex items-center gap-1.5 bg-[#1E3A5F] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#16304d]">
          <Plus size={16} /> Nuevo negocio
        </Link>
      </div>

      {(!negocios || negocios.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <Store size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Todavía no hay negocios. Creá el primero.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {negocios.map((n) => (
            <div key={n.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{n.name}</p>
                <p className="text-xs text-gray-400">
                  {n.slug} · {n.tipo_servicio}
                </p>
              </div>
              <Badge variant={ESTADO_VARIANT[n.estado] ?? 'default'}>{n.estado}</Badge>

              <form action={cambiarEstado}>
                <input type="hidden" name="id" value={n.id} />
                <select name="estado" defaultValue={n.estado}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1"
                  /* server action se dispara con el botón */>
                  <option value="prueba">prueba</option>
                  <option value="activo">activo</option>
                  <option value="suspendido">suspendido</option>
                </select>
                <button type="submit" className="ml-1 text-xs text-[#1E3A5F] hover:underline">guardar</button>
              </form>

              <form action={administrarNegocio}>
                <input type="hidden" name="slug" value={n.slug} />
                <button type="submit" className="text-xs font-medium text-white bg-[#1E3A5F] px-3 py-1.5 rounded-md hover:bg-[#16304d]">
                  Administrar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
