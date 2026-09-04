import { getStore } from '@/lib/store'
import Link from 'next/link'
import { CheckCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ order?: string; method?: string }>
}

export default async function PendientePage({ searchParams }: Props) {
  const { order } = await searchParams
  const store = await getStore()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-secondary)] mb-6">
          <CheckCircle size={32} className="text-white" />
        </div>
        <p className="eyebrow mb-2">Pedido recibido</p>
        <h1 className="heading-md text-white mb-2">¡Gracias por tu compra!</h1>
        <p className="text-white/50 text-sm mb-8">
          Tu pedido <span className="text-white font-bold font-mono">{order}</span> quedó registrado
          y ya recibimos tu comprobante de pago.
        </p>

        <div className="bg-white/5 border border-white/10 p-6 mb-6 flex items-start gap-3 text-left">
          <Clock size={18} className="text-[var(--color-secondary)] shrink-0 mt-0.5" />
          <p className="text-white/70 text-sm">
            {store?.name ?? 'El negocio'} va a revisar el comprobante y confirmar tu pedido a la brevedad.
            {store?.whatsapp_number && ' Si tenés alguna duda, escribinos por WhatsApp.'}
          </p>
        </div>

        {store?.whatsapp_number && (
          <a
            href={`https://wa.me/${store.whatsapp_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white font-bold text-sm uppercase tracking-widest hover:bg-[#20b558] transition-colors mb-4"
          >
            Escribir por WhatsApp
          </a>
        )}

        <Link href="/productos" className="block text-center text-white/40 text-xs uppercase tracking-widest font-bold hover:text-white transition-colors py-3">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
