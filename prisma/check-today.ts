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

  const meteos = await prisma.meteo.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\n📋 Météos du jour (${meteos.length}) :`)
  meteos.forEach(m => console.log(`   ${m.user.name} — ${m.mood} — ${m.createdAt.toLocaleTimeString("fr-FR")}`))

  // Vérifier Cédric en particulier
  const cedric = await prisma.user.findMany({ where: { name: { contains: "dric" } } })
  console.log(`\n👤 Comptes Cédric en base : ${cedric.length}`)
  cedric.forEach(u => console.log(`   id: ${u.id} | role: ${u.role} | slackId: ${u.slackUserId ?? "non mappé"}`))
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
