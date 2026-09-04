import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/superadmin')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') redirect('/?error=no_access')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1E3A5F] text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/superadmin" className="font-bold">Panel de Negocios</Link>
          <Link href="/admin" className="text-sm text-white/70 hover:text-white">Ir a un panel de negocio →</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-gray-400">
        Creado por Diego Aleman
      </footer>
    </div>
  )
}
