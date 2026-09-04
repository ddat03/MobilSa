import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refresca la sesión en cada request (necesario para que auth.getUser() funcione en Server Components).
// `extraRequestHeaders` permite inyectar headers internos (ej. x-store-slug) que verán los Server Components.
export async function updateSession(request: NextRequest, extraRequestHeaders?: Headers) {
  const baseHeaders = extraRequestHeaders ?? request.headers
  let supabaseResponse = NextResponse.next({ request: { headers: baseHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: baseHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Protección de rutas de paneles
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPanelRoute = path.startsWith('/admin') || path.startsWith('/superadmin')

  if (isPanelRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
