import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const user = await prisma.user.findFirst({ where: { name: "Tanguy" } })
  if (!user) { console.log("Tanguy introuvable"); return }

  // Supprimer météo du jour
  const deleted = await prisma.meteo.deleteMany({
    where: { userId: user.id, createdAt: { gte: start, lte: end } },
  })

  // Réinitialiser l'état de conversation Slack
  await prisma.user.update({
    where: { id: user.id },
    data: { slackConvState: null },
  })

  console.log(`✅ ${deleted.count} météo(s) supprimée(s) pour Tanguy`)
  console.log("✅ État de conversation réinitialisé")
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
