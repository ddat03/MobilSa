import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MenuCartItem {
  platoId: string
  nombre: string
  precio: number
  quantity: number
}

interface MenuCartStore {
  items: MenuCartItem[]
  addItem: (item: Omit<MenuCartItem, 'quantity'>, qty?: number) => void
  removeItem: (platoId: string) => void
  updateQuantity: (platoId: string, quantity: number) => void
  clear: () => void
  total: () => number
  itemCount: () => number
}

// Carrito para el módulo restaurante: no pasa por checkout con pago en la web
// (en Ecuador el pago con tarjeta no es una opción real para negocios chicos) —
// termina en un mensaje de WhatsApp prearmado que el cliente solo confirma enviar.
export const useMenuCartStore = create<MenuCartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item, qty = 1) {
        set((state) => {
          const existing = state.items.find((i) => i.platoId === item.platoId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.platoId === item.platoId ? { ...i, quantity: i.quantity + qty } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: qty }] }
        })
      },

      removeItem(platoId) {
        set((state) => ({ items: state.items.filter((i) => i.platoId !== platoId) }))
      },

      updateQuantity(platoId, quantity) {
        if (quantity <= 0) {
          get().removeItem(platoId)
          return
        }
        set((state) => ({
          items: state.items.map((i) => (i.platoId === platoId ? { ...i, quantity } : i)),
        }))
      },

      clear() {
        set({ items: [] })
      },

      total() {
        return get().items.reduce((sum, i) => sum + i.precio * i.quantity, 0)
      },

      itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'menu-cart-storage' }
  )
)
