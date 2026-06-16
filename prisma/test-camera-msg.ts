import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN!
  const user = await prisma.user.findFirst({ where: { name: "Tanguy" } })
  if (!user?.slackUserId) { console.error("Tanguy non trouvé ou pas mappé Slack"); return }

  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ users: user.slackUserId }),
  })
  const { channel } = await openRes.json()
  if (!channel?.id) { console.error("Impossible d'ouvrir le DM"); return }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: channel.id,
      text: `🌟 Super noté ! 🎬\n📹 *Enregistre ton clip ici* — dans le champ de message, clique sur *···* (plus d'options, juste en dessous) → *caméra* 🎥\nIl sera automatiquement partagé dans <#C02GDFCA6G7> !`,
    }),
  })
  const json = await res.json()
  if (json.ok) console.log("✅ Test DM envoyé à Tanguy !")
  else console.error("❌ Erreur :", json.error)
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
