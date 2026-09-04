export type ChannelName = 'telegram' | 'whatsapp'

/** Mensaje entrante ya normalizado por el adapter de canal. */
export interface IncomingMessage {
  channel: ChannelName
  userId: string           // id del usuario en el canal (chat id en Telegram)
  text?: string
  photo?: {
    buffer?: Uint8Array
    mime?: string
  }
  displayName?: string
}

/** Respuesta del core que el adapter traduce al canal. Solo texto — el LLM conversa en lenguaje natural. */
export interface OutgoingMessage {
  text: string
}

export interface CartItem {
  refId: string
  nombre: string
  precio: number
  cantidad: number
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Estado persistido por conversación (tabla conversaciones_bot.estado_flujo).
 * `messages` es el historial que ve el LLM; `cart`/`cliente`/`metodoPago` son el
 * estado "de verdad" que las tools leen y escriben — el LLM nunca calcula totales
 * ni inventa precios, solo decide qué tool llamar.
 */
export interface FlowState {
  negocioId?: string
  negocioSlug?: string
  tipoServicio?: 'tienda' | 'restaurante'
  modalidad?: 'recoger' | 'domicilio'
  cart: CartItem[]
  cliente: { nombre?: string; telefono?: string; direccion?: string }
  metodoPago?: string
  esperandoComprobante: boolean
  messages: ChatTurn[]
}

export function nuevoEstado(): FlowState {
  return { cart: [], cliente: {}, esperandoComprobante: false, messages: [] }
}
