'use client'
import { useEffect, useState } from 'react'
import { WhatsAppFloat } from './WhatsAppButton'

export function WhatsAppFloatWrapper() {
  const [number, setNumber] = useState('')

  useEffect(() => {
    const n = document.body.dataset.whatsapp ?? ''
    setNumber(n)
  }, [])

  return <WhatsAppFloat number={number} />
}
