import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminStore } from '@/lib/store'
import { MenuManager } from '@/components/admin/MenuManager'
import type { MenuCategoria, MenuPlato } from '@ecommerce/core'

export const dynamic = 'force-dynamic'

export default async function MenuAdminPage() {
  const store = await requireAdminStore()
  if (store.tipo_servicio !== 'restaurante') redirect('/admin/productos')

  const supabase = createAdminClient()
  const [{ data: categorias }, { data: platos }] = await Promise.all([
    supabase.from('menu_categorias').select('*').eq('store_id', store.id).order('orden'),
    supabase.from('menu_platos').select('*').eq('store_id', store.id).order('orden').order('nombre'),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menú</h1>
        <p className="text-sm text-gray-500">Categorías y platos de {store.name}</p>
      </div>
      <MenuManager
        categorias={(categorias ?? []) as MenuCategoria[]}
        platos={(platos ?? []) as MenuPlato[]}
        currency={store.currency}
      />
    </div>
  )
}
