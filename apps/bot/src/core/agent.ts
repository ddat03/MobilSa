import Anthropic from '@anthropic-ai/sdk'
import type { FlowState, ChatTurn } from './types.js'
import { negociosActivos, type Negocio } from './db.js'
import { TOOLS, ejecutarTool, type ToolCtx } from './tools.js'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const MAX_HISTORY = 20      // turnos que se le mandan al modelo
const MAX_TOOL_ROUNDS = 6   // corta si el modelo entra en loop de tools

const anthropic = new Anthropic({ apiKey: requireApiKey() })

function requireApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY en apps/bot/.env')
  return key
}

async function buildSystemPrompt(negocio: Negocio | null): Promise<Anthropic.TextBlockParam[]> {
  const base = [
    'Sos el asistente de pedidos de una plataforma que atiende negocios chicos en Ecuador (tiendas y restaurantes).',
    'Hablás por chat como si fueras una persona real de atención al cliente: natural, cercano, oraciones cortas, sin sonar a formulario ni a menú de opciones numeradas.',
    'No uses comandos ni le pidas al cliente que escriba números de opción — conversá en lenguaje natural y vos interpretás lo que quiere decir.',
    'Nunca inventes productos, precios, disponibilidad ni datos de pago: siempre salen de una tool (buscar_items, metodos_de_pago_disponibles, elegir_metodo_pago). Si una tool te da datos de pago, repetilos EXACTOS, sin resumir ni redondear.',
    'Pedí los datos del cliente (nombre, teléfono, dirección si aplica) de a poco, dentro de la conversación normal, no como un formulario.',
    'Cuando el cliente ya armó su pedido y confirma que quiere pagar, llamá confirmar_pedido. Si faltan datos te va a decir cuáles — pedíselos con naturalidad, no repitas literalmente la lista técnica.',
    'Una vez que confirmar_pedido salga OK, pedile la foto/captura del comprobante de pago. Vos no tenés que hacer nada más con esa foto — el sistema la procesa solo y te va a pasar una confirmación para que se la cuentes al cliente.',
    'Si el cliente quiere cancelar o arrancar de nuevo, usá cancelar_pedido.',
    'Sé breve: respuestas de chat, no párrafos largos.',
    'Si un mensaje empieza con "[sistema]", no lo escribió el cliente: es un aviso interno (ej. que ya se procesó el comprobante). Contale al cliente esa novedad con tus palabras, no repitas el texto literal ni menciones la palabra "sistema".',
  ]

  if (!negocio) {
    const negs = await negociosActivos()
    const lista = negs.map((n) => `- slug "${n.slug}": ${n.name} (${n.tipo_servicio})`).join('\n')
    base.push(
      '',
      'Todavía no sabés con qué negocio está hablando esta persona.',
      'Negocios activos ahora mismo:',
      lista || '(no hay negocios activos — avisale al cliente)',
      'Preguntale con cuál quiere hablar (podés reconocer el nombre aunque no diga el slug exacto) y en cuanto lo identifiques llamá elegir_negocio.',
    )
  } else {
    base.push(
      '',
      `Negocio actual: "${negocio.name}" (${negocio.tipo_servicio}). Moneda: ${negocio.currency}.`,
    )
  }

  return [
    {
      type: 'text',
      text: base.join('\n'),
      // Breakpoint 2 de caché: cachea tools + este system juntos (el orden real es
      // tools → system → messages). Varía por negocio a propósito — el prefijo de
      // tools (breakpoint 1, en tools.ts) igual se reaprovecha entre negocios distintos.
      cache_control: { type: 'ephemeral' },
    },
  ]
}

function toAnthropicMessages(turns: ChatTurn[]): Anthropic.MessageParam[] {
  return turns.map((t) => ({ role: t.role, content: t.content }))
}

/** Log liviano para verificar que el caché de prompts esté pegando (ver usage.cache_read_input_tokens). */
function logUsage(u: Anthropic.Usage) {
  const cached = u.cache_read_input_tokens ?? 0
  const written = u.cache_creation_input_tokens ?? 0
  console.log(`[agent] tokens in=${u.input_tokens} (cache_read=${cached}, cache_write=${written}) out=${u.output_tokens}`)
}

/**
 * Un turno completo del agente: mete el mensaje del usuario en el historial,
 * corre el loop de tool-use hasta que Claude devuelve texto final, y persiste
 * el nuevo estado (el caller es responsable de guardarEstado después).
 */
export async function runAgentTurn(state: FlowState, negocio: Negocio | null, userText: string): Promise<{ reply: string; negocio: Negocio | null }> {
  state.messages.push({ role: 'user', content: userText })
  if (state.messages.length > MAX_HISTORY) {
    state.messages = state.messages.slice(-MAX_HISTORY)
  }

  const system = await buildSystemPrompt(negocio)
  const ctx: ToolCtx = { state, negocio }
  let messages = toAnthropicMessages(state.messages)

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system,
      tools: TOOLS,
      messages,
    })
    logUsage(resp.usage)

    if (resp.stop_reason !== 'tool_use') {
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim() || 'Perdón, no supe cómo responder eso. ¿Podés reformular?'
      state.messages.push({ role: 'assistant', content: text })
      return { reply: text, negocio: ctx.negocio }
    }

    messages = [...messages, { role: 'assistant', content: resp.content }]

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of resp.content) {
      if (block.type !== 'tool_use') continue
      const result = await ejecutarTool(block.name, block.input, ctx)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
    }
    messages = [...messages, { role: 'user', content: toolResults }]
  }

  const fallback = 'Se me complicó procesar tu pedido con varios pasos seguidos — ¿podés contarme de nuevo qué necesitás?'
  state.messages.push({ role: 'assistant', content: fallback })
  return { reply: fallback, negocio: ctx.negocio }
}

/** Le avisa al agente, como si fuera información del sistema, que ya se procesó un comprobante. */
export async function narrarConfirmacion(state: FlowState, negocio: Negocio, mensajeSistema: string): Promise<string> {
  const { reply } = await runAgentTurn(state, negocio, `[sistema] ${mensajeSistema}`)
  return reply
}
