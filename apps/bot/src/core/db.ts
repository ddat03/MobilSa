import { createClient } from '@supabase/supabase-js'
import type { ChannelName, FlowState } from './types.js'
import { nuevoEstado } from './types.js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el .env del bot')

export const db = createClient(url, key, { auth: { persistSession: false } })

export interface Negocio {
  id: string
  slug: string
  name: string
  tipo_servicio: 'tienda' | 'restaurante'
  currency: string
  estado: string
  bank_name: string | null
  bank_account: string | null
  bank_holder: string | null
  bank_id: string | null
  deuna_phone: string | null
  punto_mi_vecino_codigo: string | null
  telegram_chat_id_alertas: string | null
  shipping_flat_rate: number | null
}

export async function negocioPorSlug(slug: string): Promise<Negocio | null> {
  const { data } = await db.from('store_config').select('*').eq('slug', slug).maybeSingle()
  return (data as Negocio | null) ?? null
}

export async function negociosActivos(): Promise<Pick<Negocio, 'slug' | 'name' | 'tipo_servicio'>[]> {
  const { data } = await db
    .from('store_config')
    .select('slug, name, tipo_servicio')
    .in('estado', ['activo', 'prueba'])
    .order('name')
  return data ?? []
}

/* ─── Estado de conversación (tabla conversaciones_bot) ─── */

export async function cargarEstado(canal: ChannelName, userId: string): Promise<FlowState> {
  const { data } = await db
    .from('conversaciones_bot')
    .select('estado_flujo')
    .eq('canal', canal)
    .eq('canal_user_id', userId)
    .maybeSingle()
  const raw = data?.estado_flujo as Partial<FlowState> | undefined
  if (!raw) return nuevoEstado()
  return {
    ...nuevoEstado(), ...raw,
    cart: raw.cart ?? [],
    cliente: raw.cliente ?? {},
    messages: raw.messages ?? [],
  }
}

export async function guardarEstado(
  canal: ChannelName, userId: string, negocioId: string | undefined, estado: FlowState,
) {
  await db.from('conversaciones_bot').upsert({
    canal,
    canal_user_id: userId,
    store_id: negocioId ?? null,
    estado_flujo: estado,
    ultima_interaccion: new Date().toISOString(),
  }, { onConflict: 'canal,canal_user_id' })
}

/* ─── Catálogo / menú ─── */

export interface ItemVenta { refId: string; nombre: string; precio: number; categoria: string | null }

export async function itemsDelNegocio(n: Negocio): Promise<ItemVenta[]> {
  if (n.tipo_servicio === 'restaurante') {
    const { data } = await db
      .from('menu_platos')
      .select('id, nombre, precio, disponible, menu_categorias(nombre)')
      .eq('store_id', n.id)
      .eq('disponible', true)
      .order('nombre')
    return (data ?? []).map((p: any) => ({
      refId: p.id, nombre: p.nombre, precio: Number(p.precio),
      categoria: p.menu_categorias?.nombre ?? null,
    }))
  }
  const { data } = await db
    .from('products')
    .select('id, name, price, active, categories(name)')
    .eq('store_id', n.id)
    .eq('active', true)
    .order('name')
  return (data ?? []).map((p: any) => ({
    refId: p.id, nombre: p.name, precio: Number(p.price),
    categoria: p.categories?.name ?? null,
  }))
}

/* ─── Crear pedido + cola de verificación ─── */

function orderNumber(slug: string) {
  return `${slug.toUpperCase()}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

export interface ResultadoPedido { referencia: string; total: number }

export async function crearPedido(
  n: Negocio, estado: FlowState, comprobanteUrl: string,
): Promise<ResultadoPedido> {
  const subtotal = estado.cart.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const envio = estado.modalidad === 'domicilio' ? Number(n.shipping_flat_rate ?? 0) : 0
  const total = subtotal + envio
  const cliente = estado.cliente

  let referenciaTipo: 'pedido_tienda' | 'pedido_restaurante'
  let referenciaId: string
  let referenciaLegible: string

  if (n.tipo_servicio === 'restaurante') {
    const { data, error } = await db.from('pedidos_restaurante').insert({
      store_id: n.id,
      modalidad: estado.modalidad ?? 'recoger',
      cliente_nombre: cliente.nombre ?? 'Cliente',
      cliente_telefono: cliente.telefono ?? null,
      items: estado.cart.map((i) => ({ plato_id: i.refId, nombre: i.nombre, cantidad: i.cantidad, precio_unit: i.precio })),
      direccion_envio: cliente.direccion ? { street: cliente.direccion } : null,
      costo_envio: envio,
      subtotal,
      total,
      metodo_pago: estado.metodoPago ?? null,
      comprobante_url: comprobanteUrl,
      estado: 'pago_en_revision',
      canal: 'telegram',
    }).select('id').single()
    if (error) throw new Error(error.message)
    referenciaTipo = 'pedido_restaurante'
    referenciaId = data.id
    referenciaLegible = data.id.slice(0, 8)
  } else {
    const on = orderNumber(n.slug)
    const { data, error } = await db.from('orders').insert({
      store_id: n.id,
      order_number: on,
      status: 'pago_en_revision',
      channel: 'telegram',
      subtotal,
      shipping_cost: envio,
      discount: 0,
      total,
      currency: n.currency,
      shipping_address: cliente.direccion ? { full_name: cliente.nombre, street: cliente.direccion } : null,
      customer_name: cliente.nombre ?? null,
      customer_phone: cliente.telefono ?? null,
      payment_method: estado.metodoPago ?? null,
      comprobante_url: comprobanteUrl,
    }).select('id, order_number').single()
    if (error) throw new Error(error.message)
    await db.from('order_items').insert(estado.cart.map((i) => ({
      order_id: data.id,
      product_id: i.refId,
      product_name: i.nombre,
      quantity: i.cantidad,
      unit_price: i.precio,
      total_price: i.precio * i.cantidad,
    })))
    referenciaTipo = 'pedido_tienda'
    referenciaId = data.id
    referenciaLegible = data.order_number
  }

  await db.from('pagos_verificacion').insert({
    store_id: n.id,
    referencia_tipo: referenciaTipo,
    referencia_id: referenciaId,
    comprobante_url: comprobanteUrl,
    monto_declarado: total,
    metodo_pago: estado.metodoPago ?? null,
    estado: 'pendiente',
  })

  return { referencia: referenciaLegible, total }
}

/* ─── Subida de comprobante ─── */

export async function subirComprobante(bytes: Uint8Array, mime: string): Promise<string> {
  const ext = mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : 'jpg'
  const path = `telegram/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await db.storage.from('comprobantes').upload(path, bytes, { contentType: mime, upsert: false })
  if (error) throw new Error(error.message)
  return path
}
