import { createAdminClient } from '@/lib/supabase/admin'
import { getStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { MenuItemCard } from '@/components/store/MenuItemCard'
import type { MenuPlato } from '@ecommerce/core'

export const dynamic = 'force-dynamic'

interface MenuPageProps {
  searchParams: Promise<{ categoria?: string }>
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const { categoria } = await searchParams
  const store = await getStore()
  if (!store || store.tipo_servicio !== 'restaurante') notFound()

  const supabase = createAdminClient()

  const { data: categorias } = await supabase
    .from('menu_categorias')
    .select('id, nombre, orden')
    .eq('store_id', store.id)
    .eq('activa', true)
    .order('orden')

  let query = supabase
    .from('menu_platos')
    .select('*')
    .eq('store_id', store.id)
    .eq('disponible', true)
    .order('orden')
    .order('nombre')

  const categoriaActiva = categorias?.find((c) => c.id === categoria || c.nombre.toLowerCase() === categoria)
  if (categoriaActiva) query = query.eq('categoria_id', categoriaActiva.id)

  const { data: platos } = await query

  return (
    <div className="container-px py-10">
      <div className="mb-10">
        <p className="eyebrow mb-2">Menú</p>
        <h1 className="heading-lg text-black">{store.name}</h1>
      </div>

      {/* Filtro de categorías */}
      {categorias && categorias.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-8">
          <a href="/menu"
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
              !categoriaActiva ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
            }`}>
            Todo
          </a>
          {categorias.map((c) => (
            <a key={c.id} href={`/menu?categoria=${c.id}`}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                categoriaActiva?.id === c.id ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-500 hover:border-black hover:text-black'
              }`}>
              {c.nombre}
            </a>
          ))}
        </div>
      )}

      {platos && platos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {(platos as MenuPlato[]).map((plato) => (
            <MenuItemCard key={plato.id} plato={plato} currency={store.currency} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <p className="text-gray-300 text-sm uppercase tracking-widest font-bold">Sin platos disponibles</p>
        </div>
      )}
    </div>
  )
}
