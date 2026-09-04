import { getStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { PedirForm } from '@/components/store/PedirForm'

export const dynamic = 'force-dynamic'

export default async function PedirPage() {
  const store = await getStore()
  if (!store || store.tipo_servicio !== 'restaurante') notFound()

  return (
    <div className="container-px">
      <PedirForm store={store} />
    </div>
  )
}
