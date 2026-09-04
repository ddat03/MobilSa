// Tipos base del dominio — compartidos entre web y mobile

export type TipoServicio = 'tienda' | 'restaurante'
export type EstadoNegocio = 'prueba' | 'activo' | 'suspendido'

export interface StoreConfig {
  id: string
  slug: string
  name: string
  tipo_servicio: TipoServicio
  estado: EstadoNegocio
  active: boolean
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string | null
  tagline: string | null
  currency: string
  country: string
  whatsapp_number: string | null
  instagram_url: string | null
  tiktok_url: string | null
  // Cobro manual
  bank_name: string | null
  bank_account: string | null
  bank_holder: string | null
  bank_id: string | null
  deuna_qr_url: string | null
  deuna_phone: string | null
  punto_mi_vecino_codigo: string | null
  // Alertas
  telegram_chat_id_alertas: string | null
  shipping_flat_rate: number | null
}

export interface Profile {
  id: string
  store_id: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'super_admin' | 'store_admin' | 'customer'
}

export interface Category {
  id: string
  store_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string | null
  color: string | null
  size: string | null
  price: number | null
  stock: number
  active: boolean
}

export interface Product {
  id: string
  store_id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price: number
  compare_at_price: number | null
  images: string[]
  tags: string[]
  featured: boolean
  active: boolean
  category?: Category
  variants?: ProductVariant[]
}

export interface CartItem {
  id: string
  cart_id: string
  variant_id: string
  quantity: number
  unit_price: number
  variant?: ProductVariant & { product: Pick<Product, 'id' | 'name' | 'images'> }
}

export type OrderStatus =
  | 'pending' | 'pending_payment' | 'pago_en_revision' | 'paid'
  | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export type Canal = 'web' | 'telegram' | 'whatsapp'

export interface OrderItem {
  id: string
  order_id: string
  product_name: string
  variant_info: string | null
  sku: string | null
  quantity: number
  unit_price: number
  total_price: number
}

export interface Order {
  id: string
  store_id: string
  user_id: string | null
  order_number: string
  status: OrderStatus
  channel: Canal
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  currency: string
  shipping_address: Address | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  payment_method: string | null
  comprobante_url: string | null
  notes: string | null
  created_at: string
  items?: OrderItem[]
}

export interface Address {
  id?: string
  alias?: string
  full_name: string
  phone?: string
  street: string
  city: string
  province?: string
  postal_code?: string
  country: string
}

export interface SubscriptionPlan {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
  current_period_start: string
  current_period_end: string
  plan?: SubscriptionPlan
}

// ============================================================
// MÓDULO RESTAURANTE
// ============================================================
export interface MenuCategoria {
  id: string
  store_id: string
  nombre: string
  orden: number
  activa: boolean
}

export interface MenuPlato {
  id: string
  store_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  precio: number
  foto_url: string | null
  disponible: boolean
  orden: number
}

export type EstadoReservacion =
  | 'pendiente_pago' | 'pago_en_revision' | 'confirmada' | 'cancelada' | 'completada'

export interface Reservacion {
  id: string
  store_id: string
  user_id: string | null
  cliente_nombre: string
  cliente_telefono: string | null
  fecha: string
  hora: string
  numero_personas: number
  anticipo_monto: number
  metodo_pago: string | null
  comprobante_url: string | null
  estado: EstadoReservacion
  canal: Canal
  notas: string | null
  created_at: string
}

export type ModalidadPedidoRestaurante = 'recoger' | 'domicilio'
export type EstadoPedidoRestaurante =
  | 'pendiente_pago' | 'pago_en_revision' | 'pagado' | 'preparando'
  | 'listo_o_en_camino' | 'entregado' | 'cancelado'

export interface PedidoRestauranteItem {
  plato_id: string
  nombre: string
  cantidad: number
  precio_unit: number
}

export interface PedidoRestaurante {
  id: string
  store_id: string
  user_id: string | null
  modalidad: ModalidadPedidoRestaurante
  cliente_nombre: string
  cliente_telefono: string | null
  items: PedidoRestauranteItem[]
  hora_estimada: string | null
  direccion_envio: Address | null
  costo_envio: number
  subtotal: number
  total: number
  metodo_pago: string | null
  comprobante_url: string | null
  estado: EstadoPedidoRestaurante
  canal: Canal
  notas: string | null
  created_at: string
}

// ============================================================
// VERIFICACIÓN DE PAGOS (compartido)
// ============================================================
export type ReferenciaTipo = 'pedido_tienda' | 'pedido_restaurante' | 'reservacion'
export type EstadoPagoVerificacion = 'pendiente' | 'aprobado' | 'rechazado'

export interface PagoVerificacion {
  id: string
  store_id: string
  referencia_tipo: ReferenciaTipo
  referencia_id: string
  comprobante_url: string
  monto_declarado: number | null
  metodo_pago: string | null
  estado: EstadoPagoVerificacion
  revisado_por: string | null
  fecha_revision: string | null
  notas: string | null
  created_at: string
}

// ============================================================
// ASISTENTE CONVERSACIONAL
// ============================================================
export interface ConversacionBot {
  id: string
  store_id: string
  canal: 'telegram' | 'whatsapp'
  canal_user_id: string
  estado_flujo: Record<string, unknown>
  ultima_interaccion: string
}

// Respuesta genérica de la API
export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
