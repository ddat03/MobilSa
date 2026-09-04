import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateProfile } from './actions'
import { ShoppingBag, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone, avatar_url')
    .eq('id', user.id)
    .single()

  const { count } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="container-px py-10 max-w-2xl">
      <div className="mb-8">
        <p className="eyebrow mb-2">Mi cuenta</p>
        <h1 className="heading-md text-black">
          Hola, {profile?.full_name?.split(' ')[0] ?? 'Cliente'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          href="/cuenta/pedidos"
          className="bg-white border border-gray-100 p-5 hover:border-black transition-colors group"
        >
          <ShoppingBag size={20} className="mb-3 text-gray-400 group-hover:text-black transition-colors" />
          <p className="text-3xl font-bold text-black">{count ?? 0}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Pedidos</p>
        </Link>
        <div className="bg-white border border-gray-100 p-5">
          <User size={20} className="mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Email</p>
        </div>
      </div>

      {/* Editar perfil */}
      <div className="bg-white border border-gray-100 p-6">
        <h2 className="heading-sm text-black mb-6">Editar perfil</h2>
        <form action={updateProfile} className="space-y-4">
          <div>
            <label className="label-sm">Nombre completo</label>
            <input
              name="full_name"
              defaultValue={profile?.full_name ?? ''}
              className="input"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="label-sm">Teléfono</label>
            <input
              name="phone"
              defaultValue={profile?.phone ?? ''}
              className="input"
              placeholder="+593 99 999 9999"
            />
          </div>
          <div className="pt-2">
            <button type="submit" className="btn-primary">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
