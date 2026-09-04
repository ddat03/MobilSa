import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLineItem {
  variantId: string
  productId: string
  productName: string
  variantInfo: string       // "Rojo / M"
  image: string
  unitPrice: number
  quantity: number
}

interface CartStore {
  items: CartLineItem[]
  addItem: (item: CartLineItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(newItem) {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeItem(variantId) {
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }))
      },

      updateQuantity(variantId, quantity) {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }))
      },

      clear() {
        set({ items: [] })
      },

      total() {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      },

      itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'cart-storage' }
  )
)
