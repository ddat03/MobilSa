import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/store/Navbar'
import { getStore } from '@/lib/store'

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/cuenta')

  const store = await getStore()

  return (
    <>
      <Navbar storeName={store?.name} tipoServicio={store?.tipo_servicio} />
      <main className="pt-20 min-h-screen bg-gray-50">
        {children}
      </main>
      <footer className="bg-black text-white">
        <div className="container-px py-8">
          <p className="text-white/25 text-xs text-center">
            © {new Date().getFullYear()} {store?.name ?? 'Tienda'}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  )
}
