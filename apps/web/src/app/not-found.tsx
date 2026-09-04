import Link from 'next/link'
import { ACTIVE_CONFIG } from '@ecommerce/config'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow mb-4">Error 404</p>
      <h1 className="heading-xl text-white mb-4">PÁGINA<br />NO ENCONTRADA</h1>
      <p className="text-white/30 text-sm mb-10 max-w-xs">
        La página que buscas no existe o fue movida.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/" className="btn-accent">Ir al inicio</Link>
        <Link href="/productos" className="btn-outline border-white/20 text-white hover:border-white">
          Ver productos
        </Link>
      </div>
      <p className="text-white/10 text-6xl font-black mt-16 select-none">404</p>
    </div>
  )
}
