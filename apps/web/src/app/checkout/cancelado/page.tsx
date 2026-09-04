import { Button } from '@/components/ui/Button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center py-20">
        <XCircle size={64} className="mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pago cancelado</h1>
        <p className="text-gray-500 mb-8">
          No se realizó ningún cargo. Tus productos siguen en el carrito.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/carrito">
            <Button size="lg">Volver al carrito</Button>
          </Link>
          <Link href="/productos">
            <Button variant="ghost" size="lg">Seguir comprando</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
