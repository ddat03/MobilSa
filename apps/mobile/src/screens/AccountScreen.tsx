import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { API_URL } from '../lib/config'
import { theme, formatPrice } from '../lib/theme'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pago pendiente', color: '#D97706', bg: '#FEF3C7' },
  paid:            { label: 'Pagado',          color: '#059669', bg: '#D1FAE5' },
  processing:      { label: 'En proceso',      color: '#2563EB', bg: '#DBEAFE' },
  shipped:         { label: 'Enviado',         color: '#7C3AED', bg: '#EDE9FE' },
  delivered:       { label: 'Entregado',       color: '#059669', bg: '#D1FAE5' },
  cancelled:       { label: 'Cancelado',       color: '#DC2626', bg: '#FEE2E2' },
}

export default function AccountScreen({ navigation }: any) {
  const { user, signOut } = useAuth()
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setFullName(user.user_metadata?.full_name ?? '')
    fetchOrders()
  }, [user])

  async function saveProfile() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    // Also update profiles table
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch(`${API_URL}/api/cuenta/perfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ full_name: fullName, phone }),
      })
    }
    setSaving(false)
    setEditing(false)
    Alert.alert('¡Listo!', 'Perfil actualizado.')
  }

  async function fetchOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/api/cuenta/pedidos`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (res.ok) setOrders((await res.json()).orders ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  // ─── Guest view ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi cuenta</Text>
        </View>
        <View style={styles.guestBox}>
          <Text style={{ fontSize: 72, marginBottom: 20 }}>👤</Text>
          <Text style={styles.guestTitle}>¡Bienvenido!</Text>
          <Text style={styles.guestSub}>Inicia sesión para ver tus pedidos y guardar tu información</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.btnOutlineText}>Crear cuenta gratis</Text>
          </TouchableOpacity>
          <View style={styles.benefitsBox}>
            {['📦 Seguimiento de pedidos', '💳 Historial de compras', '⚡ Checkout más rápido'].map(b => (
              <Text key={b} style={styles.benefitItem}>{b}</Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const initials = (user.user_metadata?.full_name ?? user.email ?? '?')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  // ─── Logged-in view ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi cuenta</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutLink}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {user.user_metadata?.full_name
              ? <Text style={styles.profileName}>{user.user_metadata.full_name}</Text>
              : null}
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
          <TouchableOpacity onPress={() => setEditing(e => !e)}>
            <Text style={styles.editLink}>✏️ Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Edit profile */}
        {editing ? (
          <View style={styles.editCard}>
            <Text style={styles.sectionTitle}>Editar perfil</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
              placeholder="Tu nombre" placeholderTextColor={theme.gray300} />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="+593 99 999 9999" placeholderTextColor={theme.gray300}
              keyboardType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setEditing(false)}>
                <Text style={styles.btnOutlineText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{orders.length}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {orders.filter(o => o.status === 'delivered').length}
            </Text>
            <Text style={styles.statLabel}>Entregados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {orders.filter(o => o.status === 'pending_payment').length}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>

        {/* Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis pedidos</Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
              <Text style={styles.emptyOrdersText}>Todavía no tienes pedidos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tienda')}>
                <Text style={styles.shopLink}>¡Empieza a comprar!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map(order => {
              const s = STATUS[order.status] ?? { label: order.status, color: theme.gray500, bg: theme.gray100 }
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>
                  <View style={styles.orderBottom}>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     backgroundColor: theme.white, paddingHorizontal: 16, paddingVertical: 14,
                     borderBottomWidth: 1, borderBottomColor: theme.gray100 },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: theme.gray900 },
  signOutLink:     { fontSize: 14, color: theme.primary, fontWeight: '600' },
  editLink:        { fontSize: 13, color: theme.primary, fontWeight: '600' },
  editCard:        { backgroundColor: theme.white, borderRadius: 16, padding: 16, margin: 12, marginTop: 0, gap: 8,
                     elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  label:           { fontSize: 12, fontWeight: '600', color: theme.gray700 },
  input:           { borderWidth: 1.5, borderColor: theme.gray200, borderRadius: 10,
                     paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: theme.gray900 },
  btnOutline:      { borderWidth: 1.5, borderColor: theme.primary, paddingVertical: 12,
                     borderRadius: 28, alignItems: 'center' },
  btnOutlineText:  { color: theme.primary, fontWeight: '700', fontSize: 14 },
  // Guest
  guestBox:        { flex: 1, alignItems: 'center', padding: 32, paddingTop: 48 },
  guestTitle:      { fontSize: 26, fontWeight: '800', color: theme.gray900, marginBottom: 8 },
  guestSub:        { fontSize: 14, color: theme.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btnPrimary:      { width: '100%', backgroundColor: theme.primary, paddingVertical: 15,
                     borderRadius: 28, alignItems: 'center', marginBottom: 12 },
  btnPrimaryText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnOutline:      { width: '100%', borderWidth: 1.5, borderColor: theme.primary,
                     paddingVertical: 14, borderRadius: 28, alignItems: 'center', marginBottom: 28 },
  btnOutlineText:  { color: theme.primary, fontWeight: '700', fontSize: 16 },
  benefitsBox:     { width: '100%', backgroundColor: theme.white, borderRadius: 16, padding: 20, gap: 12 },
  benefitItem:     { fontSize: 14, color: theme.gray700 },
  // Profile card
  profileCard:     { flexDirection: 'row', alignItems: 'center', gap: 14,
                     backgroundColor: theme.white, margin: 12, borderRadius: 16, padding: 16,
                     elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  avatar:          { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary,
                     justifyContent: 'center', alignItems: 'center' },
  avatarText:      { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileName:     { fontSize: 17, fontWeight: '700', color: theme.gray900 },
  profileEmail:    { fontSize: 13, color: theme.gray500, marginTop: 2 },
  // Stats
  statsRow:        { flexDirection: 'row', backgroundColor: theme.white, marginHorizontal: 12,
                     borderRadius: 16, padding: 16, marginBottom: 8,
                     elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statBox:         { flex: 1, alignItems: 'center' },
  statNum:         { fontSize: 22, fontWeight: '900', color: theme.primary },
  statLabel:       { fontSize: 11, color: theme.gray500, marginTop: 2 },
  statDivider:     { width: 1, backgroundColor: theme.gray100 },
  // Section
  section:         { margin: 12, marginTop: 8 },
  sectionTitle:    { fontSize: 16, fontWeight: '800', color: theme.gray900, marginBottom: 10 },
  // Empty orders
  emptyOrders:     { backgroundColor: theme.white, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyOrdersText: { fontSize: 15, color: theme.gray500, marginBottom: 12 },
  shopLink:        { color: theme.primary, fontWeight: '700', fontSize: 15 },
  // Order cards
  orderCard:       { backgroundColor: theme.white, borderRadius: 14, padding: 14,
                     marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  orderTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber:     { fontSize: 13, fontWeight: '700', color: theme.gray900 },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  orderBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate:       { fontSize: 12, color: theme.gray500 },
  orderTotal:      { fontSize: 16, fontWeight: '900', color: theme.primary },
})
