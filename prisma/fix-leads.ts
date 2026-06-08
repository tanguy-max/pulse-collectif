import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  // Supprimer les doublons créés avec les IDs fixes
  await prisma.user.deleteMany({ where: { id: { in: ["user-julien", "user-cedric"] } } })
  console.log("🗑️  Doublons supprimés")

  // Passer les vrais comptes en LEAD (recherche par nom)
  for (const name of ["Julien", "Cédric"]) {
    const updated = await prisma.user.updateMany({
      where: { name },
      data: { role: "LEAD" },
    })
    console.log(`✅ ${name} → LEAD (${updated.count} compte mis à jour)`)
  }

  // Vérif
  const team = await prisma.team.findUnique({ where: { joinCode: "TREELY" } })
  const users = await prisma.user.findMany({ where: { teamId: team!.id }, orderBy: { name: "asc" } })
  console.log("\n📋 Équipe Treely :")
  users.forEach(u => console.log(`   ${u.name} — ${u.role}`))
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
