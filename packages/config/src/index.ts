// Sistema de configuración white-label
// Para un nuevo cliente: duplicar un archivo de esta carpeta y cambiar los valores

export interface ClientConfig {
  // Identidad
  store_slug: string
  store_name: string
  tagline: string

  // Visual
  logo: string                   // path relativo o URL
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  font?: {
    heading: string
    body: string
  }

  // Negocio
  currency: string
  country: string
  whatsapp?: string              // número para soporte por WhatsApp
  instagram?: string
  tiktok?: string

  // Categorías por defecto del catálogo
  default_categories: string[]

  // Comportamiento
  show_stock: boolean            // mostrar "quedan X unidades"
  allow_guest_checkout: boolean  // comprar sin cuenta
  shipping_flat_rate?: number   // costo fijo de envío (null = calculado)
}

// ─── Configuración de ejemplo: tienda de ropa ───────────────
export const ROPA_CONFIG: ClientConfig = {
  store_slug: 'ropa-demo',
  store_name: 'Mi Tienda de Ropa',
  tagline: 'Moda que te define',

  logo: '/logos/ropa-logo.png',
  colors: {
    primary: '#1a1a2e',
    secondary: '#e94560',
    accent: '#f5a623',
    background: '#f8f8f8',
    text: '#1a1a1a',
  },

  currency: 'USD',
  country: 'EC',
  whatsapp: '+593999999999',
  tiktok: '@mitiendaropa',

  default_categories: ['Camisetas', 'Pantalones', 'Vestidos', 'Accesorios'],

  show_stock: true,
  allow_guest_checkout: false,
  shipping_flat_rate: 3.5,
}

// ─── Config activa (cambiar según el cliente desplegado) ─────
// En producción esto puede venir de una variable de entorno NEXT_PUBLIC_STORE_SLUG
// y cargar dinámicamente desde Supabase
export const ACTIVE_CONFIG = ROPA_CONFIG
