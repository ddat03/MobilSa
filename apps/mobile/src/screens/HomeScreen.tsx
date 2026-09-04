import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, ScrollView, Dimensions, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { theme, formatPrice, discountPct } from '../lib/theme'
import { useCart } from '../lib/cart'

const { width: W } = Dimensions.get('window')
const CARD_W = (W - 36) / 2

interface Product {
  id: string; name: string; slug: string
  price: number; compare_at_price?: number
  images?: string[]; featured?: boolean
}
interface Category { id: string; name: string; slug: string }

// ─── Promo banner data (static — could come from DB later) ──────────────────
const BANNERS = [
  { id: '1', label: 'NUEVOS INGRESOS',  sub: 'Descubre lo último en moda', bg: '#E63660', text: '#fff' },
  { id: '2', label: 'HASTA 40% OFF',    sub: 'Ofertas especiales esta semana', bg: '#111', text: '#fff' },
  { id: '3', label: 'ENVÍO GRATIS',     sub: 'En pedidos seleccionados',  bg: '#FF6B35', text: '#fff' },
]

function Banner() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 3500)
    return () => clearInterval(t)
  }, [])
  const b = BANNERS[idx]
  return (
    <View style={[styles.banner, { backgroundColor: b.bg }]}>
      <Text style={[styles.bannerLabel, { color: b.text }]}>{b.label}</Text>
      <Text style={[styles.bannerSub,   { color: b.text + 'cc' }]}>{b.sub}</Text>
      <View style={styles.bannerDots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

function CategoryPills({ selected, onSelect, categories }: {
  selected: string; onSelect: (s: string) => void; categories: Category[]
}) {
  const all = [{ id: '', name: 'Todo' }, ...categories]
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
      {all.map(c => (
        <TouchableOpacity
          key={c.id}
          style={[styles.pill, selected === c.id && styles.pillActive]}
          onPress={() => onSelect(c.id)}
        >
          <Text style={[styles.pillText, selected === c.id && styles.pillTextActive]}>
            {c.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

function ProductCard({ item, onPress }: { item: Product; onPress: () => void }) {
  const hasDiscount = !!item.compare_at_price && item.compare_at_price > item.price
  const pct = hasDiscount ? discountPct(item.price, item.compare_at_price!) : 0
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageBox}>
        {item.images?.[0]
          ? <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
          : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <Text style={{ fontSize: 40 }}>🛍️</Text>
            </View>
          )
        }
        {pct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{pct}%</Text>
          </View>
        )}
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>⭐ TOP</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          {hasDiscount && (
            <Text style={styles.comparePrice}>{formatPrice(item.compare_at_price!)}</Text>
          )}
        </View>
        {pct > 0 && (
          <Text style={styles.saving}>Ahorras {formatPrice(item.compare_at_price! - item.price)}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function HomeScreen({ navigation }: any) {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]         = useState('')
  const [catId, setCatId]           = useState('')
  const count = useCart(s => s.count())

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id,name,slug').order('sort_order')
    setCategories(data ?? [])
  }, [])

  const fetchProducts = useCallback(async () => {
    let q = supabase
      .from('products')
      .select('id,name,slug,price,compare_at_price,images,featured')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
    if (catId)         q = q.eq('category_id', catId)

    const { data } = await q
    setProducts(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [search, catId])

  useEffect(() => { fetchCategories() }, [])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  function onRefresh() { setRefreshing(true); fetchProducts() }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>MI TIENDA</Text>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Carrito')}>
            <Text style={styles.cartIcon}>🛒</Text>
            {count > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{count}</Text></View>}
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ropa, accesorios..."
            placeholderTextColor={theme.gray300}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: theme.gray300, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={
          <>
            <Banner />
            <CategoryPills selected={catId} onSelect={setCatId} categories={categories} />
            {loading
              ? null
              : (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {catId ? categories.find(c => c.id === catId)?.name ?? '' : '✨ Todos los productos'}
                  </Text>
                  <Text style={styles.sectionCount}>{products.length} artículos</Text>
                </View>
              )
            }
          </>
        }
        ListEmptyComponent={
          loading
            ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 48 }} />
            : (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
                <Text style={styles.emptyText}>No encontramos productos</Text>
                <TouchableOpacity onPress={() => { setSearch(''); setCatId('') }}>
                  <Text style={styles.emptyLink}>Ver todo</Text>
                </TouchableOpacity>
              </View>
            )
        }
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id, name: item.name })}
          />
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Header
  header:         { backgroundColor: theme.white, paddingHorizontal: 12, paddingBottom: 10,
                    borderBottomWidth: 1, borderBottomColor: theme.gray100 },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 10 },
  logo:           { fontSize: 20, fontWeight: '900', color: theme.primary, letterSpacing: 2 },
  cartBtn:        { position: 'relative', padding: 4 },
  cartIcon:       { fontSize: 24 },
  cartBadge:      { position: 'absolute', top: 0, right: 0, backgroundColor: theme.primary,
                    width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.gray100,
                    borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon:     { fontSize: 15, marginRight: 6 },
  searchInput:    { flex: 1, fontSize: 14, color: theme.gray900, padding: 0 },
  // Banner
  banner:         { marginHorizontal: 12, marginTop: 12, marginBottom: 4, borderRadius: 16,
                    paddingHorizontal: 24, paddingVertical: 28, position: 'relative', overflow: 'hidden' },
  bannerLabel:    { fontSize: 26, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  bannerSub:      { fontSize: 14, marginBottom: 16 },
  bannerDots:     { flexDirection: 'row', gap: 6 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive:      { backgroundColor: '#fff', width: 18 },
  // Category pills
  pillsRow:       { marginVertical: 10 },
  pill:           { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: theme.white, borderWidth: 1, borderColor: theme.gray200 },
  pillActive:     { backgroundColor: theme.primary, borderColor: theme.primary },
  pillText:       { fontSize: 13, color: theme.gray700, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  // Section header
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10, marginTop: 4 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: theme.gray900 },
  sectionCount:   { fontSize: 12, color: theme.gray500 },
  // Product grid
  row:            { justifyContent: 'space-between' },
  card:           { width: CARD_W, backgroundColor: theme.white, borderRadius: 12,
                    marginBottom: 12, overflow: 'hidden',
                    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
  imageBox:       { position: 'relative' },
  cardImage:      { width: CARD_W, height: CARD_W * 1.3, backgroundColor: theme.gray100 },
  imagePlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  discountBadge:  { position: 'absolute', top: 8, left: 8, backgroundColor: theme.sale,
                    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  discountText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  featuredBadge:  { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  featuredText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody:       { padding: 10 },
  cardName:       { fontSize: 12, color: theme.gray900, lineHeight: 17, marginBottom: 5 },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  cardPrice:      { fontSize: 15, fontWeight: '800', color: theme.primary },
  comparePrice:   { fontSize: 12, color: theme.gray300, textDecorationLine: 'line-through' },
  saving:         { fontSize: 10, color: theme.success, fontWeight: '600', marginTop: 2 },
  // Empty
  empty:          { alignItems: 'center', paddingTop: 48 },
  emptyText:      { fontSize: 16, color: theme.gray500, marginBottom: 12 },
  emptyLink:      { color: theme.primary, fontWeight: '700', fontSize: 14 },
})
