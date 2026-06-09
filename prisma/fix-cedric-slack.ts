import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const found = await prisma.user.findFirst({ where: { name: "Cédric" } })
  if (!found) { console.error("Cédric introuvable"); return }
  const user = await prisma.user.update({
    where: { id: found.id },
    data: { slackUserId: "U01UAMSQ62Y" },
  })
  console.log(`✅ Cédric — Slack ID mis à jour : ${user.slackUserId}`)
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
