import type { IncomingMessage, OutgoingMessage } from './types.js'
import { nuevoEstado } from './types.js'
import { cargarEstado, guardarEstado, negocioPorSlug, crearPedido, subirComprobante } from './db.js'
import { runAgentTurn, narrarConfirmacion } from './agent.js'

/**
 * Punto de entrada del core, agnóstico de canal (Telegram/WhatsApp llaman esto igual).
 * La conversación la lleva un agente LLM con tools (ver agent.ts + tools.ts); acá solo
 * se resuelve el negocio/estado persistido y el paso de la FOTO del comprobante, que
 * queda determinista a propósito (no delegamos dinero/creación de pedidos al LLM).
 */
export async function handleMessage(msg: IncomingMessage): Promise<OutgoingMessage[]> {
  const state = await cargarEstado(msg.channel, msg.userId)
  const negocio = state.negocioSlug ? await negocioPorSlug(state.negocioSlug) : null

  // Reset explícito si el cliente escribe algo tipo "empezar de nuevo" en texto plano
  // se resuelve vía la tool cancelar_pedido — el LLM decide cuándo llamarla.

  if (msg.photo?.buffer) {
    if (state.esperandoComprobante && negocio) {
      try {
        const path = await subirComprobante(msg.photo.buffer, msg.photo.mime ?? 'image/jpeg')
        const res = await crearPedido(negocio, state, path)
        const keep = { negocioId: state.negocioId, negocioSlug: state.negocioSlug, tipoServicio: state.tipoServicio, messages: state.messages }
        Object.assign(state, nuevoEstado(), keep)
        const reply = await narrarConfirmacion(
          state, negocio,
          `El comprobante se recibió y se guardó correctamente. El pedido/reserva quedó registrado con la referencia "${res.referencia}" por un total de ${res.total} ${negocio.currency}, en estado "pago en revisión" — el negocio lo va a revisar y confirmar pronto. Contáselo al cliente de forma breve y cálida.`,
        )
        await guardarEstado(msg.channel, msg.userId, state.negocioId, state)
        return [{ text: reply }]
      } catch (e: any) {
        console.error('[engine] error creando pedido desde comprobante:', e)
        await guardarEstado(msg.channel, msg.userId, state.negocioId, state)
        return [{ text: 'Uy, tuve un problema guardando ese comprobante. ¿Podés mandarlo de nuevo en un momento?' }]
      }
    }
    // Foto fuera de contexto: que el agente reaccione naturalmente.
    const { reply } = await runAgentTurn(state, negocio, '[sistema] El cliente envió una foto/imagen, pero todavía no llegamos al paso de pedir el comprobante de pago.')
    await guardarEstado(msg.channel, msg.userId, state.negocioId, state)
    return [{ text: reply }]
  }

  const text = (msg.text ?? '').trim()
  if (!text) return []

  const { reply, negocio: negocioActualizado } = await runAgentTurn(state, negocio, text)
  await guardarEstado(msg.channel, msg.userId, negocioActualizado?.id ?? state.negocioId, state)
  return [{ text: reply }]
}
