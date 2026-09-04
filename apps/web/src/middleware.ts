import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { slugFromHost } from '@/lib/store'

export async function middleware(request: NextRequest) {
  // Resolver el negocio (tenant) por subdominio y propagarlo como header interno.
  const slug =
    slugFromHost(request.headers.get('host')) ||
    process.env.NEXT_PUBLIC_STORE_SLUG ||
    'ropa-demo'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-slug', slug)

  return updateSession(request, requestHeaders)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
