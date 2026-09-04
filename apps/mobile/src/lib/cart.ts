import { create } from 'zustand'

export interface CartItem {
  variantId:   string
  productId:   string
  productName: string
  variantInfo: string
  image:       string
  unitPrice:   number
  quantity:    number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQty: (variantId: string, qty: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem(newItem) {
    set((s) => {
      const existing = s.items.find((i) => i.variantId === newItem.variantId)
      if (existing) {
        return { items: s.items.map((i) => i.variantId === newItem.variantId
          ? { ...i, quantity: i.quantity + newItem.quantity } : i) }
      }
      return { items: [...s.items, newItem] }
    })
  },
  removeItem(variantId) {
    set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) }))
  },
  updateQty(variantId, qty) {
    if (qty <= 0) { get().removeItem(variantId); return }
    set((s) => ({ items: s.items.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i) }))
  },
  clear() { set({ items: [] }) },
  total() { return get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) },
  count() { return get().items.reduce((s, i) => s + i.quantity, 0) },
}))
