import 'dotenv/config'
import { startTelegram } from './channels/telegram.js'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('Falta TELEGRAM_BOT_TOKEN en apps/bot/.env')
  process.exit(1)
}

console.log('Asistente conversacional — SaaS multi-negocio (MobilSa)')
console.log('Canal activo: Telegram. WhatsApp: pendiente (ver src/channels/whatsapp.ts)')

startTelegram(token)

// Cuando exista el adapter de WhatsApp:
// import { startWhatsApp } from './channels/whatsapp.js'
// startWhatsApp(...)
