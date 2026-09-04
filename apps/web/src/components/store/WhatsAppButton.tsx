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
 * Botón final de /pedir: ya se creó el registro en pedidos_restaurante (pendiente_pago),
 * así que el mensaje incluye la referencia para que el negocio lo encuentre en su panel.
 */
export function WhatsAppPedidoConfirmadoButton({
  number, storeName, referencia, items, modalidad, direccion, total, currency,
}: {
  number: string
  storeName: string
  referencia: string
  items: WhatsAppCartLine[]
  modalidad: 'recoger' | 'domicilio'
  direccion?: string
  total: number
  currency: string
}) {
  if (!number) return null

  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency || 'USD' }).format(n) }
    catch { return `$${n.toFixed(2)}` }
  }

  const lineas = items.map((i) => `• ${i.cantidad}x ${i.nombre} — ${fmt(i.precio * i.cantidad)}`).join('\n')
  const modalidadTxt = modalidad === 'domicilio'
    ? `Envío a domicilio${direccion ? `: ${direccion}` : ''}`
    : 'Recojo en el local'
  const message = `¡Hola ${storeName}! Hice el pedido *${referencia}* desde la web:\n\n${lineas}\n\n${modalidadTxt}\n*Total: ${fmt(total)}*\n\nQuedo atento/a a cómo coordinamos el pago. ¡Gracias!`
  const url = buildUrl(number, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest bg-[#25D366] text-white hover:bg-[#20b558] active:scale-[0.99] transition-all duration-200"
    >
      <MessageCircle size={18} fill="white" />
      Avisar por WhatsApp
    </a>
  )
}

/** Botón final de /reservar: la reserva ya quedó creada (pendiente_pago). */
export function WhatsAppReservaButton({
  number, storeName, referencia, fecha, hora, personas,
}: {
  number: string
  storeName: string
  referencia: string
  fecha: string
  hora: string
  personas: number
}) {
  if (!number) return null

  const message = `¡Hola ${storeName}! Hice una reserva *${referencia}* desde la web:\n\n📅 ${fecha} a las ${hora}\n👥 ${personas} persona${personas === 1 ? '' : 's'}\n\n¿Me confirmás y me decís cómo coordinamos el anticipo? ¡Gracias!`
  const url = buildUrl(number, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest bg-[#25D366] text-white hover:bg-[#20b558] active:scale-[0.99] transition-all duration-200"
    >
      <MessageCircle size={18} fill="white" />
      Avisar por WhatsApp
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
