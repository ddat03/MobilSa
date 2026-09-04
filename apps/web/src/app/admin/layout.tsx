import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminContext } from '@/lib/store'
import { Sidebar } from '@/components/admin/Sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()

  if (!ctx) redirect('/login?redirect=/admin')
  if (ctx.role === 'customer') redirect('/?error=no_access')

  // super_admin sin negocio elegido → que elija en /superadmin
  if (!ctx.store) {
    if (ctx.role === 'super_admin') redirect('/superadmin')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Sin negocio asignado</h1>
          <p className="text-sm text-gray-500 mb-4">
            Tu cuenta no está vinculada a ningún negocio todavía. Contactá al administrador.
          </p>
          <Link href="/" className="text-sm text-[var(--color-primary)] hover:underline">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        storeName={ctx.store.name}
        tipoServicio={ctx.store.tipo_servicio}
        isSuperAdmin={ctx.role === 'super_admin'}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
