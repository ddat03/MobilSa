import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useCart } from '../lib/cart'
import { useAuth } from '../lib/auth'
import { API_URL } from '../lib/config'
import { theme, formatPrice } from '../lib/theme'

type Step = 'auth' | 'address' | 'payment' | 'confirm'
type PaymentMethod = 'deuna' | 'bank' | 'card'

interface StoreConfig {
  deuna_phone?: string; deuna_qr_url?: string
  bank_name?: string;   bank_account?: string
  bank_holder?: string; bank_id?: string
  whatsapp_number?: string
}

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = ['Cuenta', 'Envío', 'Pago']

function StepBar({ current }: { current: number }) {
  return (
    <View style={s.stepBar}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <View style={s.stepItem}>
            <View style={[s.stepCircle, i <= current && s.stepCircleActive]}>
              <Text style={[s.stepNum, i <= current && s.stepNumActive]}>
                {i < current ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[s.stepLabel, i <= current && s.stepLabelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[s.stepLine, i < current && s.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

// ─── Payment method option ───────────────────────────────────────────────────
function MethodOption({ selected, onSelect, icon, title, subtitle }: {
  selected: boolean; onSelect: () => void
  icon: string; title: string; subtitle: string
}) {
  return (
    <TouchableOpacity style={[s.methodCard, selected && s.methodCardSelected]} onPress={onSelect}>
      <Text style={s.methodIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.methodTitle, selected && { color: theme.primary }]}>{title}</Text>
        <Text style={s.methodSub}>{subtitle}</Text>
      </View>
      <View style={[s.radio, selected && s.radioActive]}>
        {selected && <View style={s.radioDot} />}
      </View>
    </TouchableOpacity>
  )
}

export default function CheckoutScreen({ navigation }: any) {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const cartTotal = total()

  const [step, setStep]             = useState<Step>('auth')
  const [loading, setLoading]       = useState(false)
  const [config, setConfig]         = useState<StoreConfig>({})
  const [payMethod, setPayMethod]   = useState<PaymentMethod>('deuna')
  const [comprobante, setComprobante] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [uploadingComprobante, setUploadingComprobante] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderTotal, setOrderTotal]   = useState(0)
  const [form, setForm] = useState({
    full_name: '', phone: '', street: '', city: '', province: '',
  })

  useEffect(() => {
    fetchConfig()
    // Pre-fill from user profile
    if (user) {
      setForm(f => ({
        ...f,
        full_name: user.user_metadata?.full_name ?? '',
      }))
      setStep('address')
    }
  }, [user])

  async function fetchConfig() {
    try {
      const r = await fetch(`${API_URL}/api/store-config`)
      if (r.ok) {
        const d = await r.json()
        setConfig(d)
        if (!d.deuna_phone && !d.deuna_qr_url) {
          setPayMethod(d.bank_account ? 'bank' : 'card')
        }
      }
    } catch {}
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function goAddress() {
    setStep('address')
  }

  function goPayment() {
    if (!form.full_name || !form.street || !form.city) {
      Alert.alert('Campos requeridos', 'Nombre, dirección y ciudad son obligatorios.')
      return
    }
    setStep('payment')
  }

  async function elegirComprobante(fuente: 'camara' | 'galeria') {
    const permiso = fuente === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilitá el acceso para adjuntar el comprobante.')
      return
    }
    const result = fuente === 'camara'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (!result.canceled && result.assets[0]) setComprobante(result.assets[0])
  }

  function elegirComprobanteMenu() {
    Alert.alert('Comprobante de pago', '¿Cómo querés adjuntarlo?', [
      { text: 'Tomar foto', onPress: () => elegirComprobante('camara') },
      { text: 'Elegir de galería', onPress: () => elegirComprobante('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function submitManual() {
    if (!comprobante) {
      Alert.alert('Falta el comprobante', 'Adjuntá una foto del comprobante de pago para confirmar el pedido.')
      return
    }
    setLoading(true)
    try {
      // 1) Subir el comprobante
      setUploadingComprobante(true)
      const fd = new FormData()
      fd.append('file', {
        uri: comprobante.uri,
        name: comprobante.fileName ?? 'comprobante.jpg',
        type: comprobante.mimeType ?? 'image/jpeg',
      } as any)
      const upRes = await fetch(`${API_URL}/api/comprobantes`, { method: 'POST', body: fd })
      const upData = await upRes.json()
      setUploadingComprobante(false)
      if (!upRes.ok) throw new Error(upData.error ?? 'No se pudo subir el comprobante')

      // 2) Crear el pedido con la referencia del comprobante
      const res = await fetch(`${API_URL}/api/checkout/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: { ...form, country: 'Ecuador' },
          userId: user?.id ?? null,
          paymentMethod: payMethod,
          comprobanteUrl: upData.path,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el pedido')
      setOrderNumber(data.orderNumber)
      setOrderTotal(cartTotal)
      clear()
      setStep('confirm')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
      setUploadingComprobante(false)
    }
  }

  async function submitCard() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: { ...form, country: 'Ecuador' },
          userId: user?.id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error en Stripe')
      await Linking.openURL(data.url)
      Alert.alert('¿Completaste el pago?', '', [
        { text: 'No todavía' },
        { text: 'Sí, pagué', onPress: () => { clear(); navigation.navigate('Tienda') } },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally { setLoading(false) }
  }

  const hasDeuna = !!(config.deuna_phone || config.deuna_qr_url)
  const hasBank  = !!config.bank_account
  const currentStep = step === 'auth' ? 0 : step === 'address' ? 1 : 2

  // ─── Confirm screen ──────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const waText = encodeURIComponent(`Hola! Tengo una consulta sobre mi pedido ${orderNumber}.`)
    const waUrl = config.whatsapp_number
      ? `https://wa.me/${config.whatsapp_number}?text=${waText}`
      : null

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={s.confirmContainer}>
          <Text style={s.confirmCheck}>✅</Text>
          <Text style={s.confirmTitle}>¡Pedido creado!</Text>
          <Text style={s.confirmSub}>Tu número de pedido</Text>
          <Text style={s.confirmOrder}>{orderNumber}</Text>

          <Text style={s.confirmInstr}>
            Ya recibimos tu comprobante de pago. Vamos a revisarlo y confirmarte el pedido a la brevedad.
          </Text>

          {payMethod === 'deuna' && (
            <View style={s.payCard}>
              <Text style={s.payCardTitle}>💳  Pagado con De Una</Text>
              <Text style={s.payCardTotal}>{formatPrice(orderTotal)}</Text>
            </View>
          )}

          {payMethod === 'bank' && (
            <View style={s.payCard}>
              <Text style={s.payCardTitle}>🏦  Pagado por transferencia</Text>
              <Text style={s.payCardTotal}>{formatPrice(orderTotal)}</Text>
            </View>
          )}

          {waUrl && (
            <TouchableOpacity style={s.waBtn} onPress={() => Linking.openURL(waUrl)}>
              <Text style={s.waBtnText}>💬  ¿Dudas? Escribinos por WhatsApp</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('Tienda')}>
            <Text style={s.btnOutlineText}>Seguir comprando</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: theme.gray700 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      <StepBar current={currentStep} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── STEP 0: Auth ─────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <View>
            <Text style={s.stepHeading}>¿Tienes una cuenta?</Text>
            <Text style={s.stepDesc}>Inicia sesión para un checkout más rápido y seguimiento de pedidos.</Text>

            <TouchableOpacity style={s.btnPrimary}
              onPress={() => navigation.navigate('Login')}>
              <Text style={s.btnPrimaryText}>Iniciar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnOutline}
              onPress={() => navigation.navigate('Register')}>
              <Text style={s.btnOutlineText}>Crear cuenta</Text>
            </TouchableOpacity>

            <View style={s.divider}><Text style={s.dividerText}>o</Text></View>

            <TouchableOpacity style={s.btnGhost} onPress={goAddress}>
              <Text style={s.btnGhostText}>Continuar como invitado →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 1: Address ──────────────────────────────────────────────── */}
        {step === 'address' && (
          <View>
            <Text style={s.stepHeading}>Dirección de envío</Text>
            {[
              { field: 'full_name', label: 'Nombre completo *', placeholder: 'María García', keyboard: 'default' as const },
              { field: 'phone',     label: 'Teléfono',           placeholder: '+593 99 999 9999', keyboard: 'phone-pad' as const },
              { field: 'street',    label: 'Dirección *',        placeholder: 'Calle y número', keyboard: 'default' as const },
              { field: 'city',      label: 'Ciudad *',           placeholder: 'Quito', keyboard: 'default' as const },
              { field: 'province',  label: 'Provincia',          placeholder: 'Pichincha', keyboard: 'default' as const },
            ].map(({ field, label, placeholder, keyboard }) => (
              <View key={field} style={s.inputGroup}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input}
                  placeholder={placeholder}
                  placeholderTextColor={theme.gray300}
                  value={(form as any)[field]}
                  onChangeText={v => set(field, v)}
                  keyboardType={keyboard}
                />
              </View>
            ))}

            {/* Order mini-summary */}
            <View style={s.miniSummary}>
              <Text style={s.miniSummaryLabel}>Tu pedido · {items.length} art.</Text>
              <Text style={s.miniSummaryTotal}>{formatPrice(cartTotal)}</Text>
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={goPayment}>
              <Text style={s.btnPrimaryText}>Continuar al pago →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Payment ──────────────────────────────────────────────── */}
        {step === 'payment' && (
          <View>
            <Text style={s.stepHeading}>Método de pago</Text>

            {hasDeuna && (
              <MethodOption selected={payMethod === 'deuna'} onSelect={() => setPayMethod('deuna')}
                icon="💳" title="De Una" subtitle="QR o número de teléfono" />
            )}
            {hasBank && (
              <MethodOption selected={payMethod === 'bank'} onSelect={() => setPayMethod('bank')}
                icon="🏦" title="Transferencia bancaria" subtitle="Depósito o transferencia" />
            )}
            <MethodOption selected={payMethod === 'card'} onSelect={() => setPayMethod('card')}
              icon="💳" title="Tarjeta (Stripe)" subtitle="Pago seguro con tarjeta" />

            {/* Detail panel */}
            {payMethod === 'deuna' && hasDeuna && (
              <View style={s.detailBox}>
                {config.deuna_phone && <Text style={s.detailText}>📱 Número: {config.deuna_phone}</Text>}
                {config.deuna_qr_url && (
                  <Image source={{ uri: config.deuna_qr_url }} style={s.qrSmall} resizeMode="contain" />
                )}
              </View>
            )}
            {payMethod === 'bank' && hasBank && (
              <View style={s.detailBox}>
                {config.bank_name    && <Text style={s.detailText}>Banco: {config.bank_name}</Text>}
                {config.bank_account && <Text style={s.detailText}>Cuenta: {config.bank_account}</Text>}
                {config.bank_holder  && <Text style={s.detailText}>Titular: {config.bank_holder}</Text>}
                {config.bank_id      && <Text style={s.detailText}>Cédula: {config.bank_id}</Text>}
              </View>
            )}
            {payMethod === 'card' && (
              <View style={s.detailBox}>
                <Text style={s.detailText}>Se abrirá Stripe en tu navegador para completar el pago.</Text>
              </View>
            )}

            {/* Comprobante de pago — obligatorio para métodos manuales */}
            {payMethod !== 'card' && (
              <View style={s.detailBox}>
                <Text style={[s.detailText, { fontWeight: '700', marginBottom: 8 }]}>Comprobante de pago</Text>
                <TouchableOpacity style={s.comprobanteBox} onPress={elegirComprobanteMenu}>
                  {comprobante ? (
                    <>
                      <Image source={{ uri: comprobante.uri }} style={s.comprobanteThumb} resizeMode="cover" />
                      <Text style={s.comprobanteChangeText}>Tocá para cambiar la foto</Text>
                    </>
                  ) : (
                    <Text style={s.comprobantePickText}>📎  Tocá para adjuntar la foto del comprobante</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Order total */}
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>Total a pagar</Text>
              <Text style={s.totalValue}>{formatPrice(cartTotal)}</Text>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, (loading || (payMethod !== 'card' && !comprobante)) && { opacity: 0.5 }]}
              onPress={payMethod === 'card' ? submitCard : submitManual}
              disabled={loading || (payMethod !== 'card' && !comprobante)}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>
                    {payMethod === 'card' ? '💳  Pagar ahora'
                      : uploadingComprobante ? 'Subiendo comprobante...' : '✅  Confirmar pedido'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.btnGhost} onPress={() => setStep('address')}>
              <Text style={s.btnGhostText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     backgroundColor: theme.white, paddingHorizontal: 16, paddingVertical: 12,
                     borderBottomWidth: 1, borderBottomColor: theme.gray100 },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: theme.gray900 },
  // Step bar
  stepBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.white,
                     paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.gray100 },
  stepItem:        { alignItems: 'center', gap: 4 },
  stepCircle:      { width: 28, height: 28, borderRadius: 14, borderWidth: 2,
                     borderColor: theme.gray200, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.white },
  stepCircleActive:{ borderColor: theme.primary, backgroundColor: theme.primary },
  stepNum:         { fontSize: 12, fontWeight: '700', color: theme.gray300 },
  stepNumActive:   { color: theme.white },
  stepLabel:       { fontSize: 10, color: theme.gray300, fontWeight: '500' },
  stepLabelActive: { color: theme.primary, fontWeight: '700' },
  stepLine:        { flex: 1, height: 2, backgroundColor: theme.gray200, marginBottom: 14 },
  stepLineActive:  { backgroundColor: theme.primary },
  // Content
  stepHeading:     { fontSize: 20, fontWeight: '800', color: theme.gray900, marginBottom: 6, marginTop: 4 },
  stepDesc:        { fontSize: 14, color: theme.gray500, marginBottom: 20, lineHeight: 20 },
  // Inputs
  inputGroup:      { marginBottom: 14 },
  label:           { fontSize: 12, fontWeight: '600', color: theme.gray700, marginBottom: 6 },
  input:           { backgroundColor: theme.white, borderWidth: 1.5, borderColor: theme.gray200,
                     borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: theme.gray900 },
  // Mini summary
  miniSummary:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     backgroundColor: theme.primary + '11', borderRadius: 12, padding: 14, marginBottom: 16 },
  miniSummaryLabel:{ fontSize: 13, color: theme.primary, fontWeight: '600' },
  miniSummaryTotal:{ fontSize: 16, fontWeight: '900', color: theme.primary },
  // Buttons
  btnPrimary:      { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 14,
                     alignItems: 'center', marginBottom: 12 },
  btnPrimaryText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnOutline:      { borderWidth: 1.5, borderColor: theme.primary, paddingVertical: 14,
                     borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  btnOutlineText:  { color: theme.primary, fontWeight: '700', fontSize: 15 },
  btnGhost:        { paddingVertical: 14, alignItems: 'center' },
  btnGhostText:    { color: theme.gray500, fontSize: 14 },
  divider:         { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerText:     { flex: 1, textAlign: 'center', color: theme.gray300, fontSize: 13,
                     borderTopWidth: 1, borderTopColor: theme.gray200 },
  // Method cards
  methodCard:      { flexDirection: 'row', alignItems: 'center', gap: 12,
                     backgroundColor: theme.white, borderWidth: 1.5, borderColor: theme.gray200,
                     borderRadius: 14, padding: 14, marginBottom: 10 },
  methodCardSelected:{ borderColor: theme.primary, backgroundColor: theme.primary + '08' },
  methodIcon:      { fontSize: 24 },
  methodTitle:     { fontSize: 15, fontWeight: '700', color: theme.gray900 },
  methodSub:       { fontSize: 12, color: theme.gray500, marginTop: 2 },
  radio:           { width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                     borderColor: theme.gray300, justifyContent: 'center', alignItems: 'center' },
  radioActive:     { borderColor: theme.primary },
  radioDot:        { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primary },
  // Detail
  detailBox:       { backgroundColor: theme.gray50, borderRadius: 12, padding: 14, marginBottom: 14 },
  detailText:      { fontSize: 13, color: theme.gray700, marginBottom: 4 },
  qrSmall:         { width: '100%', height: 160, marginTop: 8 },
  // Comprobante
  comprobanteBox:      { borderWidth: 1.5, borderColor: theme.gray200, borderStyle: 'dashed',
                         borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: theme.white },
  comprobantePickText: { fontSize: 13, color: theme.gray500, textAlign: 'center' },
  comprobanteThumb:    { width: '100%', height: 140, borderRadius: 10, marginBottom: 8 },
  comprobanteChangeText: { fontSize: 12, color: theme.primary, fontWeight: '700' },
  // Total
  totalBox:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     backgroundColor: theme.white, borderRadius: 14, padding: 16, marginBottom: 16,
                     borderWidth: 1, borderColor: theme.gray100 },
  totalLabel:      { fontSize: 15, color: theme.gray700, fontWeight: '600' },
  totalValue:      { fontSize: 22, fontWeight: '900', color: theme.primary },
  // Confirmation
  confirmContainer:{ padding: 24, alignItems: 'center' },
  confirmCheck:    { fontSize: 64, marginBottom: 12, marginTop: 20 },
  confirmTitle:    { fontSize: 26, fontWeight: '900', color: theme.gray900, marginBottom: 6 },
  confirmSub:      { fontSize: 14, color: theme.gray500, marginBottom: 4 },
  confirmOrder:    { fontSize: 22, fontWeight: '900', color: theme.primary, letterSpacing: 1, marginBottom: 16 },
  confirmInstr:    { fontSize: 14, color: theme.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  payCard:         { width: '100%', backgroundColor: theme.white, borderRadius: 16, padding: 20,
                     marginBottom: 16, borderWidth: 1, borderColor: theme.gray100 },
  payCardTitle:    { fontSize: 15, fontWeight: '700', color: theme.gray900, marginBottom: 12 },
  payCardInfo:     { fontSize: 14, color: theme.gray700, marginBottom: 6 },
  payCardBold:     { fontWeight: '700', color: theme.gray900 },
  qr:              { width: '100%', height: 200, marginVertical: 12 },
  payCardTotal:    { fontSize: 24, fontWeight: '900', color: theme.primary, marginTop: 10 },
  waBtn:           { width: '100%', backgroundColor: '#25D366', paddingVertical: 16,
                     borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  waBtnText:       { color: '#fff', fontSize: 15, fontWeight: '800' },
})
