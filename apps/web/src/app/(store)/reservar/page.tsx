import { getStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { ReservarForm } from '@/components/store/ReservarForm'

export const dynamic = 'force-dynamic'

export default async function ReservarPage() {
  const store = await getStore()
  if (!store || store.tipo_servicio !== 'restaurante') notFound()

  return (
    <div className="container-px">
      <ReservarForm store={store} />
    </div>
  )
}
