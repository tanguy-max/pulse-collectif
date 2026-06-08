import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const team = await prisma.team.findUnique({ where: { joinCode: "TREELY" } })
  if (!team) { console.error("Équipe Treely introuvable"); return }

  const toAdd = [
    { name: "Abiola",   initials: "AB", role: "MEMBER", slackUserId: "U08CQMT12F4" },
    { name: "Claudine", initials: "CL", role: "MEMBER", slackUserId: "U09EPED3JKU" },
  ]

  for (const m of toAdd) {
    const existing = await prisma.user.findFirst({ where: { name: m.name, teamId: team.id } })
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { slackUserId: m.slackUserId },
      })
      console.log(`✅ ${m.name} — Slack ID mis à jour`)
    } else {
      await prisma.user.create({
        data: {
          name: m.name,
          initials: m.initials,
          role: m.role as "MEMBER" | "LEAD",
          teamId: team.id,
          slackUserId: m.slackUserId,
        },
      })
      console.log(`✅ ${m.name} — créé avec Slack ID`)
    }
  }

  // Vérif finale
  const users = await prisma.user.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  })
  console.log("\n📋 Équipe complète :")
  users.forEach(u => console.log(`   ${u.name} — ${u.role} — Slack: ${u.slackUserId ?? "non mappé"}`))
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
