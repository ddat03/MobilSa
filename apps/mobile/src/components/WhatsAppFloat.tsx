import React, { useEffect, useState } from 'react'
import { TouchableOpacity, Text, StyleSheet, Linking, Animated } from 'react-native'
import { supabase } from '../lib/supabase'

export default function WhatsAppFloat() {
  const [phone, setPhone] = useState('')
  const scale = new Animated.Value(1)

  useEffect(() => {
    supabase
      .from('store_config')
      .select('whatsapp_number')
      .single()
      .then(({ data }) => {
        if (data?.whatsapp_number) setPhone(data.whatsapp_number)
      })
  }, [])

  if (!phone) return null

  function onPress() {
    const text = encodeURIComponent('Hola! Me gustaría hacer una consulta sobre sus productos.')
    Linking.openURL(`https://wa.me/${phone}?text=${text}`)
  }

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  }

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Text style={styles.icon}>💬</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 80, right: 18, zIndex: 999 },
  btn:  {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#25D366',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  icon: { fontSize: 28 },
})
