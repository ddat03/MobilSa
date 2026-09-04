import { getStore } from '@/lib/store'
import { CheckoutForm } from '@/components/store/CheckoutForm'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const store = await getStore()
  return <CheckoutForm storeConfig={store} />
}
