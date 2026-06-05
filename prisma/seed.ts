import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding Treely…")

  await prisma.leadAction.deleteMany()
  await prisma.video.deleteMany()
  await prisma.gratitude.deleteMany()
  await prisma.meteo.deleteMany()
  await prisma.user.deleteMany()
  await prisma.team.deleteMany()

  const team = await prisma.team.create({
    data: { name: "Treely", joinCode: "TREELY" },
  })

  await prisma.user.create({
    data: { id: "user-tanguy", name: "Tanguy", initials: "TA", role: "LEAD", teamId: team.id },
  })

  console.log("✅ Seed terminé !")
  console.log(`   Équipe : ${team.name} (code : ${team.joinCode})`)
  console.log(`   Connexion : prénom "Tanguy" · code "TREELY"`)
  console.log(`   Autres membres : rejoignent via la page login avec le même code`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
