import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const team = await prisma.team.findUnique({ where: { joinCode: "TREELY" } })
  if (!team) { console.error("Équipe Treely introuvable"); return }

  const leads = [
    { id: "user-julien",  name: "Julien",  initials: "JU" },
    { id: "user-cedric",  name: "Cédric",  initials: "CE" },
  ]

  for (const lead of leads) {
    const user = await prisma.user.upsert({
      where: { id: lead.id },
      update: { role: "LEAD" },
      create: { id: lead.id, name: lead.name, initials: lead.initials, role: "LEAD", teamId: team.id },
    })
    console.log(`✅ ${user.name} → ${user.role}`)
  }
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
