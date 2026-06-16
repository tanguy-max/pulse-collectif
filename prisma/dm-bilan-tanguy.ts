import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const MOOD_BLOCKS = {
  type: "actions",
  elements: [
    { type: "button", text: { type: "plain_text", text: "🌟 Super"      }, action_id: "bilan_SUN",   style: "primary" },
    { type: "button", text: { type: "plain_text", text: "👍 Normale"    }, action_id: "bilan_CLOUD" },
    { type: "button", text: { type: "plain_text", text: "😐 Bof"        }, action_id: "bilan_FOG"   },
    { type: "button", text: { type: "plain_text", text: "😰 Stressante" }, action_id: "bilan_RAIN"  },
    { type: "button", text: { type: "plain_text", text: "😴 Fatiguante" }, action_id: "bilan_STORM", style: "danger" },
  ],
}

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN!
  const user = await prisma.user.findFirst({ where: { name: "Tanguy" } })
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
      text: "📋 Ta semaine, c'était comment ?",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "📋 *Ta semaine, c'était comment ?*" } },
        MOOD_BLOCKS,
      ],
    }),
  })
  console.log("✅ DM bilan envoyé à Tanguy !")
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
