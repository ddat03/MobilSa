import { requireAdminStore } from '@/lib/store'
import { ConfigForm } from '@/components/admin/ConfigForm'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  const store = await requireAdminStore()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de la tienda</h1>
        <p className="text-sm text-gray-500">Los cambios se aplican en toda la tienda al instante.</p>
      </div>
      <ConfigForm store={store} />
    </div>
  )
}
