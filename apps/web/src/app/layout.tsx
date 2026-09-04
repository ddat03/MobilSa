import type { Metadata } from 'next'
import './globals.css'
import { getStore } from '@/lib/store'
import { Bebas_Neue, Inter } from 'next/font/google'
import { WhatsAppFloatWrapper } from '@/components/store/WhatsAppFloatWrapper'

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore()
  return {
    title: store?.name ?? 'Tienda',
    description: store?.tagline ?? undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore()

  const primary   = store?.primary_color   ?? '#000000'
  const secondary = store?.secondary_color ?? '#FF6B00'
  const whatsapp  = store?.whatsapp_number ?? ''

  return (
    <html lang="es" className={`${bebas.variable} ${inter.variable}`}>
      <head>
        <style>{`
          :root {
            --color-primary:   ${primary};
            --color-secondary: ${secondary};
            --color-accent:    ${secondary};
            --font-heading:    var(--font-heading);
            --font-body:       var(--font-body);
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-white font-sans antialiased" style={{ fontFamily: 'var(--font-body, Inter, sans-serif)' }} data-whatsapp={whatsapp}>
        {children}
        <WhatsAppFloatWrapper />
      </body>
    </html>
  )
}
