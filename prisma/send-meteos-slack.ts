import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const MOOD_LABELS: Record<string, string> = {
  SUN:   "☀️ Au top",
  CLOUD: "⛅ Correct",
  RAIN:  "🌧️ Difficile",
  STORM: "⛈️ Épuisé·e",
  FOG:   "🌫️ Flou",
}

async function main() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const meteos = await prisma.meteo.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  })

  if (meteos.length === 0) {
    console.log("Aucune météo aujourd'hui.")
    return
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL!

  for (const m of meteos) {
    const moodLabel = MOOD_LABELS[m.mood] ?? m.mood
    const lines = [`*${m.user.name}* — ${moodLabel}`]
    if (m.contextText && m.contextAudience === "TEAM") lines.push(`> ${m.contextText}`)
    if (m.blockerText && m.blockerAudience === "TEAM") lines.push(`> 🚧 ${m.blockerText}`)

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    })
    console.log(`${res.ok ? "✅" : "❌"} ${m.user.name} — ${moodLabel}`)
  }
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
