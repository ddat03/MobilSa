'use client'
import { useEffect, useState } from 'react'
import { ACTIVE_CONFIG } from '@ecommerce/config'

/**
 * Nombre del negocio actual para componentes cliente (pantallas de auth, etc.)
 * que no pueden llamar a getStore() directo. Arranca con el fallback fijo
 * (deploy dedicado de ropa) y se actualiza al primer render si /api/store-config
 * devuelve un nombre distinto (negocio real detectado por subdominio).
 */
export function useStoreName(): string {
  const [name, setName] = useState(ACTIVE_CONFIG.store_name)

  useEffect(() => {
    let cancelled = false
    fetch('/api/store-config')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.name) setName(data.name)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return name
}
