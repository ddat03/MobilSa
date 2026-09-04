'use client'
import { useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { ACTIVE_CONFIG } from '@ecommerce/config'

export default function CheckoutSuccessPage() {
  const { clear } = useCartStore()

  useEffect(() => {
    clear()
  }, [clear])

  return (
    <div className="min-height-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center py-20">
        <CheckCircle size={64} className="mx-auto text-green-500 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-2">
          Gracias por tu compra en <strong>{ACTIVE_CONFIG.store_name}</strong>.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Recibirás una confirmación pronto. Nos comunicaremos contigo para coordinar el envío.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/productos">
            <Button size="lg">Seguir comprando</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="lg">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
