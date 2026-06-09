import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const MOOD_BLOCKS = {
  type: "actions",
  elements: [
    { type: "button", text: { type: "plain_text", text: "☀️ Au top"          }, action_id: "meteo_SUN",   style: "primary" },
    { type: "button", text: { type: "plain_text", text: "⛅ Correct"          }, action_id: "meteo_CLOUD" },
    { type: "button", text: { type: "plain_text", text: "🌧️ Difficile"       }, action_id: "meteo_RAIN"  },
    { type: "button", text: { type: "plain_text", text: "⛈️ Mal dormi"       }, action_id: "meteo_STORM", style: "danger" },
    { type: "button", text: { type: "plain_text", text: "🌫️ Stressé·e"      }, action_id: "meteo_FOG"   },
    { type: "button", text: { type: "plain_text", text: "😤 Mauvaise humeur" }, action_id: "meteo_ANGER", style: "danger" },
  ],
}

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN!
  const user = await prisma.user.findFirst({ where: { name: "Cédric" } })
  if (!user?.slackUserId) { console.error("Pas de Slack ID"); return }

  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ users: user.slackUserId }),
  })
  const { channel } = await openRes.json()
  if (!channel?.id) { console.error("Impossible d'ouvrir le DM"); return }

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: channel.id,
      text: "🌤️ Comment tu vas aujourd'hui ?",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "🌤️ *Comment tu vas aujourd'hui ?*\nClique sur ton humeur :" } },
        MOOD_BLOCKS,
      ],
    }),
  })
  console.log("✅ DM météo envoyé à Cédric !")
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
