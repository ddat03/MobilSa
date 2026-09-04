'use client'
import { MessageCircle } from 'lucide-react'

interface WhatsAppButtonProps {
  number: string
  message?: string
  variant?: 'floating' | 'inline' | 'product'
  productName?: string
}

function buildUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export interface WhatsAppCartLine { nombre: string; cantidad: number; precio: number }

/**
 * Botón "Finalizar pedido por WhatsApp": arma el mensaje con el pedido completo
 * ya escrito — el cliente solo tiene que tocar Enviar en la app de WhatsApp.
 * Pensado para el módulo restaurante (no hay checkout con pago en la web: en
 * Ecuador el pago con tarjeta no es una opción real para negocios chicos).
 */
export function WhatsAppCartButton({
  number, storeName, items, total, currency,
}: {
  number: string
  storeName: string
  items: WhatsAppCartLine[]
  total: number
  currency: string
}) {
  if (!number) return null

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency || 'USD' }).format(n) }
    catch { return `$${n.toFixed(2)}` }
  }

  const lineas = items.map((i) => `• ${i.cantidad}x ${i.nombre} — ${fmt(i.precio * i.cantidad)}`).join('\n')
  const message = `¡Hola ${storeName}! Quiero hacer este pedido:\n\n${lineas}\n\n*Total: ${fmt(total)}*`
  const url = buildUrl(number, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest bg-[#25D366] text-white hover:bg-[#20b558] active:scale-[0.99] transition-all duration-200"
    >
      <MessageCircle size={18} fill="white" />
      Finalizar pedido por WhatsApp
    </a>
  )
}

/* Botón flotante global (esquina inferior derecha) */
export function WhatsAppFloat({ number }: { number: string }) {
  if (!number) return null
  const url = buildUrl(number, '¡Hola! Quisiera más información sobre sus productos.')
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 shadow-lg hover:bg-[#20b558] transition-colors"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle size={20} fill="white" />
      <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">WhatsApp</span>
    </a>
  )
}

/* Botón en la página de producto */
export function WhatsAppProductButton({ number, productName }: { number: string; productName: string }) {
  if (!number) return null
  const message = `¡Hola! Me interesa el producto: *${productName}*. ¿Está disponible?`
  const url = buildUrl(number, message)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest bg-[#25D366] text-white hover:bg-[#20b558] active:scale-[0.99] transition-all duration-200"
    >
      <MessageCircle size={17} fill="white" />
      Preguntar por WhatsApp
    </a>
  )
}

/* Botón en admin para notificar a cliente */
export function WhatsAppNotifyButton({
  number, orderNumber, status,
}: {
  number: string
  orderNumber: string
  status: string
}) {
  if (!number) return null

  const statusMessages: Record<string, string> = {
    shipped:   `¡Hola! Tu pedido *${orderNumber}* ha sido enviado. Pronto lo recibirás. ¡Gracias por tu compra!`,
    delivered: `¡Hola! Tu pedido *${orderNumber}* ha sido entregado. ¡Esperamos que te encante! ⭐`,
    cancelled: `Hola, te informamos que tu pedido *${orderNumber}* fue cancelado. Escríbenos para más información.`,
  }

  const message = statusMessages[status]
    ?? `Hola, actualización de tu pedido *${orderNumber}*: ${status}.`

  const url = buildUrl(number, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-bold hover:bg-[#20b558] transition-colors"
    >
      <MessageCircle size={15} fill="white" />
      Notificar por WhatsApp
    </a>
  )
}
