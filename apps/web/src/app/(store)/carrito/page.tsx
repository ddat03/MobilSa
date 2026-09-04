import { getStore } from '@/lib/store'
import { notFound } from 'next/navigation'
import { TiendaCartView } from '@/components/store/TiendaCartView'
import { MenuCartView } from '@/components/store/MenuCartView'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const store = await getStore()
  if (!store) notFound()

  if (store.tipo_servicio === 'restaurante') {
    return <MenuCartView storeName={store.name} whatsappNumber={store.whatsapp_number} currency={store.currency} />
  }

  return <TiendaCartView currency={store.currency} shipping={store.shipping_flat_rate ?? 0} />
}
