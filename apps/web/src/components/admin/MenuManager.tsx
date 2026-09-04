'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import {
  crearCategoriaMenu, renombrarCategoriaMenu, eliminarCategoriaMenu,
  guardarPlato, eliminarPlato, toggleDisponiblePlato,
} from '@/app/admin/actions/menu'
import type { MenuCategoria, MenuPlato } from '@ecommerce/core'

interface Props {
  categorias: MenuCategoria[]
  platos: MenuPlato[]
  currency: string
}

const field = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]'

export function MenuManager({ categorias, platos, currency }: Props) {
  const [editing, setEditing] = useState<MenuPlato | null>(null)
  const [creating, setCreating] = useState(false)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency || 'USD' }).format(n)

  const catName = (id: string | null) =>
    categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'

  return (
    <div className="space-y-8">
      {/* ─── Categorías ─── */}
      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Categorías del menú</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {categorias.map((c) => (
            <CategoriaChip key={c.id} categoria={c} />
          ))}
          {categorias.length === 0 && (
            <p className="text-sm text-gray-400">Todavía no hay categorías. Agregá la primera (ej. Entradas, Fuertes, Bebidas).</p>
          )}
        </div>
        <form action={crearCategoriaMenu} className="flex gap-2 max-w-sm">
          <input name="nombre" required placeholder="Nueva categoría" className={field} />
          <button type="submit" className="shrink-0 inline-flex items-center gap-1 bg-[var(--color-primary)] text-white text-sm px-3 py-2 rounded-lg">
            <Plus size={15} /> Agregar
          </button>
        </form>
      </section>

      {/* ─── Platos ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Platos ({platos.length})</h2>
          <button onClick={() => { setCreating(true); setEditing(null) }}
            className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-sm px-4 py-2 rounded-lg">
            <Plus size={16} /> Nuevo plato
          </button>
        </div>

        {(creating || editing) && (
          <PlatoForm
            key={editing?.id ?? 'new'}
            plato={editing}
            categorias={categorias}
            onClose={() => { setCreating(false); setEditing(null) }}
          />
        )}

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 mt-4">
          {platos.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Sin platos todavía.</p>
          ) : platos.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{p.nombre}</p>
                <p className="text-xs text-gray-400">{catName(p.categoria_id)}{p.descripcion ? ` · ${p.descripcion}` : ''}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">{fmt(p.precio)}</span>
              <form action={toggleDisponiblePlato}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="disponible" value={String(!p.disponible)} />
                <button type="submit">
                  <Badge variant={p.disponible ? 'success' : 'default'}>
                    {p.disponible ? 'Disponible' : 'Agotado'}
                  </Badge>
                </button>
              </form>
              <button onClick={() => { setEditing(p); setCreating(false) }}
                className="p-1.5 text-gray-400 hover:text-[var(--color-primary)]">
                <Pencil size={15} />
              </button>
              <form action={eliminarPlato}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="p-1.5 text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function CategoriaChip({ categoria }: { categoria: MenuCategoria }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <form action={renombrarCategoriaMenu} className="flex items-center gap-1">
        <input type="hidden" name="id" value={categoria.id} />
        <input name="nombre" defaultValue={categoria.nombre} autoFocus
          className="border border-gray-300 rounded px-2 py-1 text-sm w-32" />
        <button type="submit" className="text-xs text-[var(--color-primary)]">ok</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400">
          <X size={12} />
        </button>
      </form>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-sm">
      {categoria.nombre}
      <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
        <Pencil size={11} />
      </button>
      <form action={eliminarCategoriaMenu} className="inline">
        <input type="hidden" name="id" value={categoria.id} />
        <button type="submit" className="text-gray-400 hover:text-red-500">
          <X size={12} />
        </button>
      </form>
    </span>
  )
}

function PlatoForm({
  plato, categorias, onClose,
}: { plato: MenuPlato | null; categorias: MenuCategoria[]; onClose: () => void }) {
  return (
    <form action={async (fd) => { await guardarPlato(fd); onClose() }}
      className="bg-white border border-[var(--color-primary)]/30 rounded-xl p-5 space-y-4">
      {plato && <input type="hidden" name="id" value={plato.id} />}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{plato ? 'Editar plato' : 'Nuevo plato'}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label-sm">Nombre *</label>
          <input name="nombre" required defaultValue={plato?.nombre} className={field + ' mt-1'} placeholder="Ej: Chaulafán de pollo" />
        </div>
        <div>
          <label className="label-sm">Categoría</label>
          <select name="categoria_id" defaultValue={plato?.categoria_id ?? ''} className={field + ' mt-1'}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label-sm">Descripción</label>
        <textarea name="descripcion" rows={2} defaultValue={plato?.descripcion ?? ''} className={field + ' mt-1 resize-none'} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label-sm">Precio *</label>
          <input name="precio" type="number" step="0.01" min="0" required defaultValue={plato?.precio} className={field + ' mt-1'} placeholder="0.00" />
        </div>
        <div>
          <label className="label-sm">URL de la foto</label>
          <input name="foto_url" defaultValue={plato?.foto_url ?? ''} className={field + ' mt-1'} placeholder="https://..." />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="disponible" defaultChecked={plato ? plato.disponible : true} className="w-4 h-4" />
        <span className="text-sm text-gray-700">Disponible</span>
      </label>

      <div className="flex gap-2">
        <button type="submit" className="bg-[var(--color-primary)] text-white text-sm font-medium px-4 py-2 rounded-lg">
          {plato ? 'Guardar' : 'Crear plato'}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
      </div>
    </form>
  )
}
