import { Telegraf } from 'telegraf'
import { handleMessage } from '../core/engine.js'
import type { IncomingMessage, OutgoingMessage } from '../core/types.js'

/**
 * Adapter de canal para Telegram.
 * Traduce updates de Telegram → IncomingMessage del core, y OutgoingMessage → mensajes de Telegram.
 * El core (agente LLM conversacional) no sabe nada de Telegram: para sumar WhatsApp se
 * escribe otro adapter igual (ver ../channels/whatsapp.ts) que llame a `handleMessage`
 * de la misma forma — no hay que tocar la lógica de conversación.
 */
export function startTelegram(token: string) {
  const bot = new Telegraf(token)

  async function responder(chatId: number, outs: OutgoingMessage[]) {
    for (const out of outs) {
      if (!out.text) continue
      await bot.telegram.sendMessage(chatId, out.text)
    }
  }

  async function procesar(chatId: number, incoming: IncomingMessage) {
    try {
      await bot.telegram.sendChatAction(chatId, 'typing')
      const outs = await handleMessage(incoming)
      await responder(chatId, outs)
    } catch (err: any) {
      console.error('[telegram] error procesando mensaje:', err)
      await bot.telegram.sendMessage(chatId, 'Uy, tuve un problema procesando eso. ¿Podés intentar de nuevo en un momento?')
        .catch(() => {})
    }
  }

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id
    console.log(`[telegram] ${chatId} (${ctx.from.first_name}): ${ctx.message.text}`)
    await procesar(chatId, {
      channel: 'telegram',
      userId: String(chatId),
      text: ctx.message.text,
      displayName: ctx.from.first_name,
    })
  })

  bot.on('photo', async (ctx) => {
    const chatId = ctx.chat.id
    const photos = ctx.message.photo
    const biggest = photos[photos.length - 1]
    console.log(`[telegram] ${chatId} (${ctx.from.first_name}): <foto>`)
    try {
      const link = await ctx.telegram.getFileLink(biggest.file_id)
      const resp = await fetch(link.href)
      const buffer = new Uint8Array(await resp.arrayBuffer())
      await procesar(chatId, {
        channel: 'telegram',
        userId: String(chatId),
        photo: { buffer, mime: 'image/jpeg' },
        displayName: ctx.from.first_name,
      })
    } catch (err) {
      console.error('[telegram] error bajando foto:', err)
      await ctx.reply('No pude descargar la imagen. Probá enviarla de nuevo.')
    }
  })

  bot.catch((err) => console.error('[telegram] error no capturado:', err))

  bot.telegram.getMe()
    .then((me) => {
      console.log(`[telegram] conectado como @${me.username} (id ${me.id})`)
      bot.launch({ dropPendingUpdates: true }) // launch() no resuelve hasta bot.stop() — el polling ya arrancó
      console.log('[telegram] long polling activo — escribile al bot para probar')
    })
    .catch((e) => { console.error('[telegram] no pude conectar:', e); process.exit(1) })

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))

  return bot
}
