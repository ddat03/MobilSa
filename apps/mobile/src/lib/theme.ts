export const theme = {
  primary:    '#E63660',   // Shein-style pink-red
  secondary:  '#FF6B35',   // orange sale accent
  bg:         '#F7F7F7',
  white:      '#FFFFFF',
  black:      '#111111',
  gray50:     '#FAFAFA',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray300:    '#D1D5DB',
  gray500:    '#6B7280',
  gray700:    '#374151',
  gray900:    '#111827',
  success:    '#10B981',
  error:      '#EF4444',
  whatsapp:   '#25D366',
  sale:       '#E63660',
  gold:       '#F59E0B',
}

export const currency = 'USD'

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function discountPct(price: number, compare: number): number {
  return Math.round((1 - price / compare) * 100)
}
