import type Anthropic from '@anthropic-ai/sdk'
import type { FlowState } from './types.js'
import { negocioPorSlug, negociosActivos, itemsDelNegocio, type Negocio } from './db.js'

export interface ToolCtx {
  state: FlowState
  negocio: Negocio | null
}

type ToolExecutor = (input: any, ctx: ToolCtx) => Promise<unknown>

/* ─────────────────────  Definiciones (schema Anthropic)  ───────────────────── */

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'elegir_negocio',
    description: 'Fija con qué negocio va a hablar el cliente a partir de lo que dijo (nombre o slug). Llamala en cuanto tengas claro cuál de los negocios activos quiere.',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'slug exacto del negocio (viene de la lista de negocios activos)' } },
      required: ['slug'],
    },
  },
  {
    name: 'buscar_items',
    description: 'Consulta el catálogo/menú REAL del negocio (con precios reales). Usala siempre antes de ofrecer o confirmar un producto/plato — nunca inventes nombres ni precios.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'texto de búsqueda opcional, ej. "camiseta" o "pollo"' } },
    },
  },
  {
    name: 'agregar_al_carrito',
    description: 'Agrega una cantidad de un ítem (por su id, obtenido de buscar_items) al carrito del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        cantidad: { type: 'integer', minimum: 1 },
      },
      required: ['item_id', 'cantidad'],
    },
  },
  {
    name: 'quitar_del_carrito',
    description: 'Quita (o reduce) un ítem del carrito.',
    input_schema: {
      type: 'object',
      properties: { item_id: { type: 'string' }, cantidad: { type: 'integer', minimum: 1, description: 'cuánto restar; si no se manda, lo saca por completo' } },
      required: ['item_id'],
    },
  },
  {
    name: 'ver_carrito',
    description: 'Devuelve el contenido actual del carrito y el subtotal.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'elegir_modalidad',
    description: 'Sólo para restaurantes: fija si el pedido es para recoger en el local o para envío a domicilio.',
    input_schema: {
      type: 'object',
      properties: { modalidad: { type: 'string', enum: ['recoger', 'domicilio'] } },
      required: ['modalidad'],
    },
  },
  {
    name: 'guardar_datos_cliente',
    description: 'Guarda nombre, teléfono y/o dirección del cliente a medida que los va dando en la conversación (no hace falta pedirlos todos juntos).',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        telefono: { type: 'string' },
        direccion: { type: 'string' },
      },
    },
  },
  {
    name: 'metodos_de_pago_disponibles',
    description: 'Devuelve los métodos de pago que este negocio acepta (para ofrecérselos al cliente).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'elegir_metodo_pago',
    description: 'Fija el método de pago elegido y devuelve los datos EXACTOS para pagar (cuenta, QR, punto Mi Vecino). Repetiselos al cliente tal cual, sin resumir ni inventar.',
    input_schema: {
      type: 'object',
      properties: { metodo: { type: 'string', description: 'la key del método, tal como la devolvió metodos_de_pago_disponibles' } },
      required: ['metodo'],
    },
  },
  {
    name: 'confirmar_pedido',
    description: 'Valida que el pedido esté completo (carrito, datos del cliente, método de pago) y lo deja listo para recibir la foto del comprobante. Llamala cuando el cliente confirme que ya está todo.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'cancelar_pedido',
    description: 'Vacía el carrito y los datos cargados para empezar de nuevo, si el cliente lo pide.',
    input_schema: { type: 'object', properties: {} },
    // Última tool de la lista: breakpoint de caché. Las tools son idénticas para
    // TODOS los negocios, así que este bloque se reutiliza entre conversaciones
    // distintas (no solo dentro de una misma charla) — TTL largo a propósito.
    cache_control: { type: 'ephemeral', ttl: '1h' },
  },
]

/* ─────────────────────  Ejecutores  ───────────────────── */

const requireNegocio = (ctx: ToolCtx) => {
  if (!ctx.negocio) throw new ToolError('Todavía no elegiste con qué negocio hablás — usá elegir_negocio primero.')
}

class ToolError extends Error {}

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  async elegir_negocio(input, ctx) {
    const n = await negocioPorSlug(String(input.slug ?? '').trim())
    if (!n) {
      const negs = await negociosActivos()
      return { error: 'no existe ese negocio', negocios_activos: negs }
    }
    ctx.state.negocioId = n.id
    ctx.state.negocioSlug = n.slug
    ctx.state.tipoServicio = n.tipo_servicio
    ctx.negocio = n
    return { ok: true, negocio: n.name, tipo_servicio: n.tipo_servicio }
  },

  async buscar_items(input, ctx) {
    requireNegocio(ctx)
    const items = await itemsDelNegocio(ctx.negocio!)
    const q = String(input.query ?? '').toLowerCase().trim()
    const filtrados = q ? items.filter((i) => i.nombre.toLowerCase().includes(q)) : items
    return { moneda: ctx.negocio!.currency, items: filtrados.slice(0, 40) }
  },

  async agregar_al_carrito(input, ctx) {
    requireNegocio(ctx)
    const items = await itemsDelNegocio(ctx.negocio!)
    const item = items.find((i) => i.refId === input.item_id)
    if (!item) return { error: 'ese item_id no existe, volvé a buscar con buscar_items' }
    const cantidad = Math.max(1, parseInt(String(input.cantidad ?? 1), 10) || 1)
    const existing = ctx.state.cart.find((c) => c.refId === item.refId)
    if (existing) existing.cantidad += cantidad
    else ctx.state.cart.push({ refId: item.refId, nombre: item.nombre, precio: item.precio, cantidad })
    return resumenCarrito(ctx)
  },

  async quitar_del_carrito(input, ctx) {
    const existing = ctx.state.cart.find((c) => c.refId === input.item_id)
    if (!existing) return { error: 'ese ítem no está en el carrito' }
    if (input.cantidad) existing.cantidad -= Number(input.cantidad)
    else existing.cantidad = 0
    ctx.state.cart = ctx.state.cart.filter((c) => c.cantidad > 0)
    return resumenCarrito(ctx)
  },

  async ver_carrito(_input, ctx) {
    return resumenCarrito(ctx)
  },

  async elegir_modalidad(input, ctx) {
    requireNegocio(ctx)
    if (ctx.negocio!.tipo_servicio !== 'restaurante') return { error: 'esto solo aplica a restaurantes' }
    if (input.modalidad !== 'recoger' && input.modalidad !== 'domicilio') return { error: 'modalidad inválida' }
    ctx.state.modalidad = input.modalidad
    return { ok: true, modalidad: input.modalidad }
  },

  async guardar_datos_cliente(input, ctx) {
    if (input.nombre) ctx.state.cliente.nombre = String(input.nombre).trim()
    if (input.telefono) ctx.state.cliente.telefono = String(input.telefono).replace(/[^\d+]/g, '')
    if (input.direccion) ctx.state.cliente.direccion = String(input.direccion).trim()
    return { ok: true, cliente: ctx.state.cliente }
  },

  async metodos_de_pago_disponibles(_input, ctx) {
    requireNegocio(ctx)
    return { metodos: metodosDePago(ctx.negocio!).map((m) => ({ key: m.key, label: m.label })) }
  },

  async elegir_metodo_pago(input, ctx) {
    requireNegocio(ctx)
    const metodos = metodosDePago(ctx.negocio!)
    const m = metodos.find((x) => x.key === input.metodo)
    if (!m) return { error: 'método inválido', metodos_validos: metodos.map((x) => x.key) }
    ctx.state.metodoPago = m.key
    return { ok: true, datos_de_pago: m.detalle }
  },

  async confirmar_pedido(_input, ctx) {
    requireNegocio(ctx)
    const faltan: string[] = []
    if (ctx.state.cart.length === 0) faltan.push('al menos un ítem en el carrito')
    if (!ctx.state.cliente.nombre) faltan.push('nombre del cliente')
    if (!ctx.state.cliente.telefono) faltan.push('teléfono del cliente')
    const necesitaDireccion = ctx.negocio!.tipo_servicio === 'tienda' || ctx.state.modalidad === 'domicilio'
    if (necesitaDireccion && !ctx.state.cliente.direccion) faltan.push('dirección de entrega')
    if (ctx.negocio!.tipo_servicio === 'restaurante' && !ctx.state.modalidad) faltan.push('si es para recoger o a domicilio')
    if (!ctx.state.metodoPago) faltan.push('método de pago')

    if (faltan.length > 0) return { ok: false, faltan }

    ctx.state.esperandoComprobante = true
    const subtotal = ctx.state.cart.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const envio = ctx.state.modalidad === 'domicilio' ? Number(ctx.negocio!.shipping_flat_rate ?? 0) : 0
    return { ok: true, total: subtotal + envio, moneda: ctx.negocio!.currency, siguiente_paso: 'pedile la foto del comprobante de pago' }
  },

  async cancelar_pedido(_input, ctx) {
    ctx.state.cart = []
    ctx.state.cliente = {}
    ctx.state.metodoPago = undefined
    ctx.state.modalidad = undefined
    ctx.state.esperandoComprobante = false
    return { ok: true }
  },
}

export async function ejecutarTool(name: string, input: any, ctx: ToolCtx): Promise<unknown> {
  const fn = TOOL_EXECUTORS[name]
  if (!fn) return { error: `tool desconocida: ${name}` }
  try {
    return await fn(input, ctx)
  } catch (e) {
    if (e instanceof ToolError) return { error: e.message }
    console.error(`[tools] error en ${name}:`, e)
    return { error: 'error interno ejecutando la acción' }
  }
}

/* ─────────────────────  Helpers  ───────────────────── */

function resumenCarrito(ctx: ToolCtx) {
  const subtotal = ctx.state.cart.reduce((s, i) => s + i.precio * i.cantidad, 0)
  return { carrito: ctx.state.cart, subtotal, moneda: ctx.negocio?.currency ?? 'USD' }
}

export function metodosDePago(n: Negocio): { key: string; label: string; detalle: string }[] {
  const m: { key: string; label: string; detalle: string }[] = []
  if (n.bank_account) {
    m.push({
      key: 'transferencia',
      label: 'Transferencia bancaria',
      detalle: `Banco: ${n.bank_name ?? '-'} | Cuenta: ${n.bank_account} | Titular: ${n.bank_holder ?? '-'}${n.bank_id ? ` | Cédula/RUC: ${n.bank_id}` : ''}`,
    })
  }
  if (n.deuna_phone) {
    m.push({ key: 'deuna', label: 'De Una', detalle: `Número De Una: ${n.deuna_phone}` })
  }
  if (n.punto_mi_vecino_codigo) {
    m.push({ key: 'mi_vecino', label: 'Mi Vecino (efectivo)', detalle: `Código de punto Mi Vecino: ${n.punto_mi_vecino_codigo}. Se paga en efectivo en cualquier punto Mi Vecino.` })
  }
  if (m.length === 0) {
    m.push({ key: 'coordinar', label: 'Coordinar con el negocio', detalle: 'Este negocio todavía no cargó un método de pago automático — avisale al cliente que lo van a contactar para coordinar el pago.' })
  }
  return m
}
