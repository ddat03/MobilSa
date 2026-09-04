'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, X } from 'lucide-react'
import { createProduct, updateProduct, uploadProductImage, crearCategoria } from '@/app/admin/actions/products'
import type { Category, Product, ProductVariant } from '@ecommerce/core'

interface ProductFormProps {
  storeId: string
  categories: Category[]
  product?: Product & { variants?: ProductVariant[] }
}

interface VariantRow {
  color: string
  size: string
  price: string
  stock: number
  sku: string
}

export function ProductForm({ storeId, categories, product }: ProductFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages]     = useState<string[]>(product?.images ?? [])

  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants?.length
      ? product.variants.map((v) => ({
          color: v.color ?? '',
          size:  v.size  ?? '',
          price: v.price?.toString() ?? '',
          stock: v.stock,
          sku:   v.sku   ?? '',
        }))
      : [{ color: '', size: '', price: '', stock: 0, sku: '' }]
  )

  const [tags, setTags]         = useState<string[]>(product?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  const [cats, setCats]         = useState<Category[]>(categories)
  const [catId, setCatId]       = useState<string>(product?.category_id ?? '')
  const [newCat, setNewCat]     = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const [hasComparePrice, setHasComparePrice] = useState<boolean>(
    product?.compare_at_price != null && product.compare_at_price > 0
  )

  async function handleAddCategory() {
    const name = newCat.trim()
    if (!name) return
    setAddingCat(true)
    const res = await crearCategoria(name)
    setAddingCat(false)
    if ('error' in res) { setError(res.error); return }
    setCats((c) => [...c, { ...(res as any), slug: '', description: null, image_url: null, sort_order: 0, store_id: storeId }])
    setCatId(res.id)
    setNewCat('')
  }

  function addVariant() {
    setVariants((v) => [...v, { color: '', size: '', price: '', stock: 0, sku: '' }])
  }
  function removeVariant(i: number) {
    setVariants((v) => v.filter((_, idx) => idx !== i))
  }
  function updateVariant(i: number, field: keyof VariantRow, val: string | number) {
    setVariants((v) => v.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }
  function addTag(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag])
    setTagInput('')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!product?.id) return
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('product_id', product.id)
    const result = await uploadProductImage(fd)
    if (result.url) setImages((imgs) => [...imgs, result.url!])
    if (result.error) setError(result.error)
    setUploadingImage(false)
  }

  // type="button" + onClick — evita cualquier submit nativo del browser
  async function handleSave() {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (!formRef.current) {
        setError('Error interno: formulario no encontrado')
        return
      }

      const nameEl  = formRef.current.elements.namedItem('name') as HTMLInputElement
      const priceEl = formRef.current.elements.namedItem('price') as HTMLInputElement

      if (!nameEl?.value?.trim())  { setError('El nombre del producto es obligatorio'); setLoading(false); return }
      if (!priceEl?.value || isNaN(parseFloat(priceEl.value))) { setError('El precio debe ser un número válido'); setLoading(false); return }
      if (!storeId) { setError('Error: la tienda no está configurada. Verifica que el slug "ropa-demo" existe en store_config.'); setLoading(false); return }

      const fd = new FormData(formRef.current)
      fd.set('store_id', storeId)
      fd.set('variants', JSON.stringify(variants))
      fd.set('tags', tags.join(','))

      setSuccess(`Conectando con el servidor...`)

      if (product) {
        await updateProduct(fd)
        setSuccess('¡Guardado correctamente!')
        router.refresh()
      } else {
        const result = await createProduct(fd)
        setSuccess(`¡Producto creado! Redirigiendo...`)
        // Usamos location.href para forzar recarga completa de sesión
        window.location.href = `/admin/productos/${result.productId}`
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error desconocido. Abre F12 > Console para ver el detalle.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      {/* Info básica */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Información básica</h3>

        <div>
          <label className="label-sm">Nombre *</label>
          <input name="name" required defaultValue={product?.name}
            className="input mt-1" placeholder="Ej: Camiseta básica blanca" />
        </div>

        <div>
          <label className="label-sm">Descripción</label>
          <textarea name="description" rows={3} defaultValue={product?.description ?? ''}
            className="input mt-1 resize-none" placeholder="Describe el producto..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">Categoría</label>
            <select name="category_id" value={catId} onChange={(e) => setCatId(e.target.value)} className="input mt-1">
              <option value="">Sin categoría</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-1.5 mt-1.5">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                className="input flex-1 text-sm py-1" placeholder="Nueva categoría..." />
              <button type="button" onClick={handleAddCategory} disabled={addingCat || !newCat.trim()}
                className="text-xs px-2 rounded border border-gray-200 text-gray-600 hover:border-[var(--color-primary)] disabled:opacity-40">
                {addingCat ? '...' : '+ Añadir'}
              </button>
            </div>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="featured" defaultChecked={product?.featured} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Producto destacado</span>
            </label>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label-sm">Etiquetas (Enter para agregar)</label>
          <div className="flex flex-wrap gap-1.5 mt-1 p-2 border border-gray-200 rounded-lg min-h-10">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                {tag}
                <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
              className="flex-1 min-w-24 text-sm outline-none bg-transparent"
              placeholder={tags.length === 0 ? 'nueva-etiqueta...' : ''} />
          </div>
        </div>
      </div>

      {/* Precios */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Precios</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">Precio de venta *</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input name="price" type="number" step="0.01" min="0" required
                defaultValue={product?.price} className="input pl-7" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-1">
              <input type="checkbox" checked={hasComparePrice}
                onChange={(e) => setHasComparePrice(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Mostrar precio anterior (tachado)</span>
            </label>
            {hasComparePrice && (
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input name="compare_at_price" type="number" step="0.01" min="0"
                  defaultValue={product?.compare_at_price ?? ''} className="input pl-7" placeholder="0.00" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variantes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Variantes</h3>
          <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
            <Plus size={14} className="mr-1" /> Agregar variante
          </Button>
        </div>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase px-1">
            <span className="col-span-3">Color</span>
            <span className="col-span-2">Talla</span>
            <span className="col-span-2">SKU</span>
            <span className="col-span-2">Precio</span>
            <span className="col-span-2">Stock</span>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={v.color} onChange={(e) => updateVariant(i, 'color', e.target.value)}
                className="input col-span-3" placeholder="Rojo" />
              <input value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)}
                className="input col-span-2" placeholder="M" />
              <input value={v.sku} onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                className="input col-span-2" placeholder="SKU-001" />
              <input value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)}
                type="number" step="0.01" min="0" className="input col-span-2" placeholder="—" />
              <input value={v.stock} onChange={(e) => updateVariant(i, 'stock', parseInt(e.target.value) || 0)}
                type="number" min="0" className="input col-span-2" />
              <button type="button" onClick={() => removeVariant(i)}
                className="col-span-1 text-gray-300 hover:text-red-400 flex justify-center">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Imágenes — solo visible al editar */}
      {product && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Imágenes</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((img, i) => (
              <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={img} alt="" className="object-cover w-full h-full" />
              </div>
            ))}
            {images.length === 0 && <p className="text-sm text-gray-400">Sin imágenes.</p>}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg px-3 py-1.5 hover:bg-[var(--color-primary)] hover:text-white transition-colors">
            {uploadingImage ? 'Subiendo...' : '+ Agregar imagen'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
          </label>
        </div>
      )}

      {/* Mensajes de estado */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          ❌ {error}
        </div>
      )}
      {success && !error && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✓ {success}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" size="lg" loading={loading} onClick={handleSave}>
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
