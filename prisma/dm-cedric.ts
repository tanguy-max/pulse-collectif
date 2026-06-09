import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN!
  const user = await prisma.user.findFirst({ where: { name: "Cédric" } })
  console.log("Cédric en DB:", user?.id, "| slackId:", user?.slackUserId)

  if (!user?.slackUserId) { console.error("Pas de Slack ID"); return }

  // Tenter d'ouvrir le DM
  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ users: user.slackUserId }),
  })
  const openData = await openRes.json()
  console.log("conversations.open:", JSON.stringify(openData))

  if (!openData.channel?.id) { console.error("Impossible d'ouvrir le DM"); return }

  // Envoyer le message
  const msgRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: openData.channel.id,
      text: "🌤️ Test DM Cédric — Pulse Collectif",
    }),
  })
  const msgData = await msgRes.json()
  console.log("chat.postMessage:", JSON.stringify(msgData))
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
