import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'

export default function LoginScreen({ navigation }: any) {
  const [tab, setTab]           = useState<'login' | 'forgot'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Error', 'Ingresa tu email y contraseña.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Error', 'Email o contraseña incorrectos.')
  }

  async function handleForgot() {
    if (!email) { Alert.alert('Error', 'Ingresa tu email primero.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (error) { Alert.alert('Error', 'No pudimos enviar el email.'); return }
    Alert.alert('¡Listo!', `Te enviamos un enlace a ${email} para restablecer tu contraseña.`, [
      { text: 'OK', onPress: () => setTab('login') },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.white }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container}>
          <Text style={s.logo}>MI TIENDA</Text>

          {/* Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, tab === 'login'  && s.tabActive]} onPress={() => setTab('login')}>
              <Text style={[s.tabText, tab === 'login'  && s.tabTextActive]}>Iniciar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, tab === 'forgot' && s.tabActive]} onPress={() => setTab('forgot')}>
              <Text style={[s.tabText, tab === 'forgot' && s.tabTextActive]}>Olvidé contraseña</Text>
            </TouchableOpacity>
          </View>

          {tab === 'login' ? (
            <View style={s.form}>
              <View style={s.inputGroup}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="tu@email.com" placeholderTextColor={theme.gray300}
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.label}>CONTRASEÑA</Text>
                <TextInput style={s.input} value={password} onChangeText={setPassword}
                  placeholder="••••••••" placeholderTextColor={theme.gray300} secureTextEntry />
              </View>
              <TouchableOpacity style={s.btnPrimary} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Entrar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGhost} onPress={() => navigation.navigate('Register')}>
                <Text style={s.btnGhostText}>¿No tienes cuenta? Regístrate</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={s.forgotDesc}>
                Ingresa tu email y te enviamos un enlace para crear una nueva contraseña.
              </Text>
              <View style={s.inputGroup}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="tu@email.com" placeholderTextColor={theme.gray300}
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
              <TouchableOpacity style={s.btnPrimary} onPress={handleForgot} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Enviar enlace</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGhost} onPress={() => setTab('login')}>
                <Text style={s.btnGhostText}>← Volver al login</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:     { flexGrow: 1, padding: 24, paddingTop: 40 },
  logo:          { fontSize: 28, fontWeight: '900', color: theme.primary, letterSpacing: 4,
                   textAlign: 'center', marginBottom: 32 },
  tabs:          { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: theme.gray100, marginBottom: 28 },
  tab:           { flex: 1, paddingBottom: 12, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: theme.primary, marginBottom: -2 },
  tabText:       { fontSize: 13, color: theme.gray400 as any, fontWeight: '600' },
  tabTextActive: { color: theme.primary },
  form:          { gap: 16 },
  forgotDesc:    { fontSize: 14, color: theme.gray500, lineHeight: 22 },
  inputGroup:    { gap: 6 },
  label:         { fontSize: 10, fontWeight: '700', color: theme.gray500, letterSpacing: 2 },
  input:         { borderWidth: 1.5, borderColor: theme.gray200, borderRadius: 12,
                   paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: theme.gray900,
                   backgroundColor: theme.white },
  btnPrimary:    { backgroundColor: theme.primary, paddingVertical: 15, borderRadius: 28, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontSize: 15, fontWeight: '800' },
  btnGhost:      { paddingVertical: 12, alignItems: 'center' },
  btnGhostText:  { color: theme.gray500, fontSize: 13 },
})
