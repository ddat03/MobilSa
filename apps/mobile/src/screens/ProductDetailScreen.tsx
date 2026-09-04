import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Dimensions, StatusBar,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { theme, formatPrice, discountPct } from '../lib/theme'
import { useCart } from '../lib/cart'

const { width: W } = Dimensions.get('window')
const IMG_H = W * 1.25

export default function ProductDetailScreen({ route, navigation }: any) {
  const { productId } = route.params
  const [product, setProduct]             = useState<any>(null)
  const [loading, setLoading]             = useState(true)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize]   = useState<string | null>(null)
  const [imgIdx, setImgIdx]               = useState(0)
  const [added, setAdded]                 = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    supabase
      .from('products')
      .select('*, variants:product_variants(*), category:categories(name)')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        setProduct(data)
        const colors = [...new Set<string>(data?.variants?.map((v: any) => v.color).filter(Boolean) ?? [])]
        const sizes  = [...new Set<string>(data?.variants?.map((v: any) => v.size).filter(Boolean) ?? [])]
        if (colors.length) setSelectedColor(colors[0])
        if (sizes.length)  setSelectedSize(sizes[0])
        setLoading(false)
      })
  }, [productId])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  )

  if (!product) return (
    <View style={styles.center}>
      <Text style={{ color: theme.gray500 }}>Producto no encontrado</Text>
    </View>
  )

  const images = product.images?.length ? product.images : [null]
  const colors = Array.from(new Set<string>(product.variants?.map((v: any) => v.color).filter(Boolean) ?? []))
  const sizes  = Array.from(new Set<string>(product.variants?.map((v: any) => v.size).filter(Boolean) ?? []))

  const matchingVariant = product.variants?.find((v: any) => {
    const colorOk = !v.color || v.color === selectedColor
    const sizeOk  = !v.size  || v.size  === selectedSize
    return colorOk && sizeOk
  })
  const inStock = matchingVariant ? matchingVariant.stock > 0 : false
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
  const pct = hasDiscount ? discountPct(product.price, product.compare_at_price) : 0

  function handleAddToCart() {
    if (!matchingVariant || !inStock) return
    const variantInfo = [selectedColor, selectedSize].filter(Boolean).join(' / ')
    addItem({
      variantId:   matchingVariant.id,
      productId:   product.id,
      productName: product.name,
      variantInfo,
      image:       product.images?.[0] ?? '',
      unitPrice:   matchingVariant.price ?? product.price,
      quantity:    1,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.white }}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={{ position: 'relative' }}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
          >
            {images.map((img: string | null, i: number) => (
              <View key={i} style={styles.imageSlide}>
                {img
                  ? <Image source={{ uri: img }} style={styles.heroImage} resizeMode="cover" />
                  : (
                    <View style={[styles.heroImage, styles.imagePlaceholder]}>
                      <Text style={{ fontSize: 72 }}>🛍️</Text>
                    </View>
                  )
                }
              </View>
            ))}
          </ScrollView>

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          {/* Discount badge */}
          {pct > 0 && (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>-{pct}% OFF</Text>
            </View>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_: any, i: number) => (
                <View key={i} style={[styles.imageDot, i === imgIdx && styles.imageDotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Category & name */}
          {product.category && (
            <Text style={styles.categoryLabel}>{product.category.name}</Text>
          )}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Price row */}
          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {hasDiscount && (
                <Text style={styles.comparePrice}>{formatPrice(product.compare_at_price)}</Text>
              )}
              {pct > 0 && (
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>-{pct}%</Text>
                </View>
              )}
            </View>
            {hasDiscount && (
              <Text style={styles.savingText}>
                Ahorras {formatPrice(product.compare_at_price - product.price)}
              </Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Colors */}
          {colors.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Color</Text>
                <Text style={styles.sectionValue}>{selectedColor}</Text>
              </View>
              <View style={styles.optionsWrap}>
                {colors.map((c: string) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorBtn, selectedColor === c && styles.colorBtnActive]}
                    onPress={() => setSelectedColor(c)}
                  >
                    <Text style={[styles.optionText, selectedColor === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Talla</Text>
                <Text style={styles.sectionValue}>{selectedSize}</Text>
              </View>
              <View style={styles.optionsWrap}>
                {sizes.map((s: string) => {
                  const v = product.variants?.find((v: any) => v.size === s && (!v.color || v.color === selectedColor))
                  const oos = v?.stock === 0
                  return (
                    <TouchableOpacity
                      key={s}
                      disabled={oos}
                      style={[styles.sizeBtn, selectedSize === s && styles.sizeBtnActive, oos && styles.oosBtnStyle]}
                      onPress={() => setSelectedSize(s)}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedSize === s && { color: '#fff' },
                        oos && { color: theme.gray300, textDecorationLine: 'line-through' }
                      ]}>{s}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Stock & description */}
          {matchingVariant && (
            <View style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: inStock ? theme.success : theme.error }]} />
              <Text style={{ color: inStock ? theme.success : theme.error, fontSize: 13 }}>
                {inStock ? `${matchingVariant.stock} disponibles` : 'Sin stock'}
              </Text>
            </View>
          )}

          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Descripción</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {/* Space for sticky footer */}
          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>{formatPrice(product.price)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (!inStock || !matchingVariant) && styles.addBtnDisabled, added && styles.addBtnAdded]}
          onPress={handleAddToCart}
          disabled={!inStock || !matchingVariant}
        >
          <Text style={styles.addBtnText}>
            {added ? '✓  Agregado al carrito' : inStock ? '🛒  Agregar al carrito' : 'Sin stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.white },
  imageSlide:       { width: W },
  heroImage:        { width: W, height: IMG_H },
  imagePlaceholder: { backgroundColor: theme.gray100, justifyContent: 'center', alignItems: 'center' },
  backBtn:          { position: 'absolute', top: 44, left: 16, width: 40, height: 40,
                      borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  backBtnText:      { color: '#fff', fontSize: 20, fontWeight: '300' },
  heroBadge:        { position: 'absolute', top: 44, right: 16, backgroundColor: theme.primary,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText:    { color: '#fff', fontWeight: '800', fontSize: 13 },
  imageDots:        { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  imageDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  imageDotActive:   { backgroundColor: theme.white, width: 18 },
  content:          { padding: 16 },
  categoryLabel:    { fontSize: 12, color: theme.gray500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  productName:      { fontSize: 20, fontWeight: '700', color: theme.gray900, lineHeight: 28, marginBottom: 12 },
  priceBlock:       { marginBottom: 12 },
  priceRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  price:            { fontSize: 28, fontWeight: '900', color: theme.primary },
  comparePrice:     { fontSize: 16, color: theme.gray300, textDecorationLine: 'line-through' },
  pctBadge:         { backgroundColor: theme.sale + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pctText:          { color: theme.sale, fontWeight: '800', fontSize: 13 },
  savingText:       { fontSize: 12, color: theme.success, marginTop: 4, fontWeight: '600' },
  divider:          { height: 1, backgroundColor: theme.gray100, marginVertical: 14 },
  section:          { marginBottom: 14 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel:     { fontSize: 14, fontWeight: '700', color: theme.gray900 },
  sectionValue:     { fontSize: 14, color: theme.gray500 },
  optionsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionText:       { fontSize: 13, fontWeight: '500', color: theme.gray700 },
  colorBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                      borderWidth: 1.5, borderColor: theme.gray200, backgroundColor: theme.white },
  colorBtnActive:   { backgroundColor: theme.primary, borderColor: theme.primary },
  sizeBtn:          { minWidth: 52, height: 44, borderRadius: 8, borderWidth: 1.5,
                      borderColor: theme.gray200, justifyContent: 'center', alignItems: 'center',
                      paddingHorizontal: 10, backgroundColor: theme.white },
  sizeBtnActive:    { backgroundColor: theme.primary, borderColor: theme.primary },
  oosBtnStyle:      { borderColor: theme.gray100, backgroundColor: theme.gray50, opacity: 0.5 },
  stockRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  stockDot:         { width: 8, height: 8, borderRadius: 4 },
  description:      { fontSize: 14, color: theme.gray500, lineHeight: 22, marginTop: 8 },
  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0,
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: theme.white, padding: 16,
                      borderTopWidth: 1, borderTopColor: theme.gray100,
                      paddingBottom: 28 },
  footerPrice:      { },
  footerPriceLabel: { fontSize: 11, color: theme.gray500 },
  footerPriceValue: { fontSize: 18, fontWeight: '900', color: theme.gray900 },
  addBtn:           { flex: 1, backgroundColor: theme.primary, borderRadius: 14,
                      paddingVertical: 14, alignItems: 'center' },
  addBtnDisabled:   { backgroundColor: theme.gray300 },
  addBtnAdded:      { backgroundColor: theme.success },
  addBtnText:       { color: '#fff', fontSize: 15, fontWeight: '800' },
})
