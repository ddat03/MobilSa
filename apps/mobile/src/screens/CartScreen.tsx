import React from 'react'
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../lib/cart'
import { theme, formatPrice } from '../lib/theme'

const { width: W } = Dimensions.get('window')

export default function CartScreen({ navigation }: any) {
  const { items, removeItem, updateQty, total, count } = useCart()
  const cartTotal = total()
  const itemCount = count()

  if (itemCount === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi carrito</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 72, marginBottom: 16 }}>🛍️</Text>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>Agrega productos para verlos aquí</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Tienda')}>
            <Text style={styles.shopBtnText}>Explorar productos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi carrito</Text>
        <Text style={styles.headerCount}>{itemCount} artículo{itemCount > 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.variantId}
        contentContainerStyle={{ padding: 12, paddingBottom: 180 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Product image */}
            <View style={styles.imageBox}>
              {item.image
                ? <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                : (
                  <View style={[styles.image, { backgroundColor: theme.gray100, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 28 }}>🛍️</Text>
                  </View>
                )
              }
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
              {item.variantInfo ? (
                <View style={styles.variantChip}>
                  <Text style={styles.variantText}>{item.variantInfo}</Text>
                </View>
              ) : null}
              <Text style={styles.unitPrice}>{formatPrice(item.unitPrice)} c/u</Text>
              <Text style={styles.lineTotal}>{formatPrice(item.unitPrice * item.quantity)}</Text>

              {/* Qty controls */}
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQty(item.variantId, item.quantity - 1)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQty(item.variantId, item.quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remove */}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => Alert.alert(
                'Eliminar', `¿Quitar "${item.productName}"?`,
                [{ text: 'Cancelar', style: 'cancel' },
                 { text: 'Quitar', style: 'destructive', onPress: () => removeItem(item.variantId) }]
              )}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Order summary — sticky footer */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({itemCount} art.)</Text>
          <Text style={styles.summaryValue}>{formatPrice(cartTotal)}</Text>
        </View>
        <View style={[styles.summaryRow, { marginBottom: 14 }]}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={[styles.summaryValue, { color: theme.success }]}>A convenir</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutBtnText}>Comprar ahora →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     backgroundColor: theme.white, paddingHorizontal: 16, paddingVertical: 14,
                     borderBottomWidth: 1, borderBottomColor: theme.gray100 },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: theme.gray900 },
  headerCount:     { fontSize: 13, color: theme.gray500 },
  emptyState:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:      { fontSize: 20, fontWeight: '700', color: theme.gray900, marginBottom: 8 },
  emptySubtitle:   { fontSize: 14, color: theme.gray500, marginBottom: 28 },
  shopBtn:         { backgroundColor: theme.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  shopBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  card:            { flexDirection: 'row', backgroundColor: theme.white, borderRadius: 16,
                     marginBottom: 10, overflow: 'hidden',
                     elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  imageBox:        { },
  image:           { width: 100, height: 130 },
  info:            { flex: 1, padding: 12, gap: 4 },
  productName:     { fontSize: 13, fontWeight: '600', color: theme.gray900, lineHeight: 18 },
  variantChip:     { alignSelf: 'flex-start', backgroundColor: theme.gray100,
                     paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  variantText:     { fontSize: 11, color: theme.gray500 },
  unitPrice:       { fontSize: 11, color: theme.gray400 } as any,
  lineTotal:       { fontSize: 15, fontWeight: '800', color: theme.primary },
  qtyRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn:          { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
                     borderColor: theme.gray200, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText:      { fontSize: 17, color: theme.gray900, lineHeight: 20 },
  qty:             { fontSize: 15, fontWeight: '700', color: theme.gray900, minWidth: 22, textAlign: 'center' },
  removeBtn:       { padding: 12, justifyContent: 'flex-start' },
  removeIcon:      { fontSize: 15, color: theme.gray300 },
  summary:         { position: 'absolute', bottom: 0, left: 0, right: 0,
                     backgroundColor: theme.white, padding: 16, paddingBottom: 28,
                     borderTopWidth: 1, borderTopColor: theme.gray100,
                     elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel:    { fontSize: 14, color: theme.gray500 },
  summaryValue:    { fontSize: 14, color: theme.gray900, fontWeight: '600' },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between',
                     paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.gray100, marginBottom: 14 },
  totalLabel:      { fontSize: 16, fontWeight: '700', color: theme.gray900 },
  totalValue:      { fontSize: 20, fontWeight: '900', color: theme.primary },
  checkoutBtn:     { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
})
