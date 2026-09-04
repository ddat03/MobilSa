/**
 * ⚠️ ADAPTER DE WHATSAPP — pendiente.
 *
 * El día que un negocio necesite WhatsApp, se implementa acá SIN tocar el core:
 * este archivo solo traduce mensajes de WhatsApp ↔ IncomingMessage / OutgoingMessage
 * y llama a `handleMessage` de `../core/engine.js`, igual que hace `telegram.ts`.
 *
 * Dos caminos posibles (ver saasmultinegocioplan.md §2):
 *   1. Baileys / whatsapp-web.js — gratis, se conecta escaneando un QR con el número
 *      del negocio. No es oficial; riesgo bajo de ban.
 *   2. WhatsApp Business Cloud API (Meta) — oficial, cobra por conversación, exige
 *      verificar el negocio. Recomendado si el negocio ya factura por ahí.
 *
 * El core (engine.ts + db.ts) no cambia: solo se agrega el arranque de este adapter
 * en src/index.ts.
 */

// import { handleMessage } from '../core/engine.js'
// export function startWhatsApp(/* config */) { ... }

export {}
