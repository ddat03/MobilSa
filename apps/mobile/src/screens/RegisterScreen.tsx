import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Todos los campos son obligatorios.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('¡Listo!', 'Revisa tu email para confirmar tu cuenta.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ])
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.black }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.brand}>MI TIENDA</Text>

          <View style={styles.box}>
            <Text style={styles.title}>CREAR CUENTA</Text>

            {[
              { label: 'NOMBRE', value: fullName, setter: setFullName, placeholder: 'Tu nombre', secure: false, keyboard: 'default' as const },
              { label: 'EMAIL',  value: email,    setter: setEmail,    placeholder: 'tu@email.com', secure: false, keyboard: 'email-address' as const },
              { label: 'CONTRASEÑA', value: password, setter: setPassword, placeholder: 'Mínimo 6 caracteres', secure: true, keyboard: 'default' as const },
            ].map(({ label, value, setter, placeholder, secure, keyboard }) => (
              <View key={label} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={secure}
                  keyboardType={keyboard}
                  autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnPrimaryText}>CREAR CUENTA</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.btnSecondaryText}>¿Ya tienes cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand:           { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 4, textAlign: 'center', marginBottom: 40 },
  box:             { gap: 16 },
  title:           { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 8 },
  inputGroup:      { gap: 6 },
  label:           { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },
  input:           { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)',
                     paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#fff' },
  btnPrimary:      { backgroundColor: theme.secondary, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnPrimaryText:  { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  btnSecondary:    { paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText:{ color: 'rgba(255,255,255,0.5)', fontSize: 13 },
})
