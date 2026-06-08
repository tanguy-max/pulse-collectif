import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const botToken = process.env.SLACK_BOT_TOKEN!

  // Récupérer tous les membres Slack
  const res = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${botToken}` },
  })
  const { members, ok, error } = await res.json()
  if (!ok) { console.error("Slack error:", error); return }

  // Récupérer les utilisateurs Pulse
  const pulseUsers = await prisma.user.findMany()
  console.log(`\n📋 Membres Slack trouvés : ${members.filter((m: any) => !m.is_bot && !m.deleted).length}`)
  console.log(`📋 Utilisateurs Pulse : ${pulseUsers.map(u => u.name).join(", ")}\n`)

  let mapped = 0
  for (const slackMember of members) {
    if (slackMember.is_bot || slackMember.deleted || slackMember.id === "USLACKBOT") continue

    const slackName = (slackMember.real_name || slackMember.profile?.display_name || "").toLowerCase()
    const firstName = slackName.split(" ")[0]

    const pulseUser = pulseUsers.find(u => {
      const pName = u.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      const sName = firstName.normalize("NFD").replace(/[̀-ͯ]/g, "")
      return pName === sName || pName.startsWith(sName) || sName.startsWith(pName)
    })

    if (pulseUser) {
      await prisma.user.update({
        where: { id: pulseUser.id },
        data: { slackUserId: slackMember.id },
      })
      console.log(`✅ ${pulseUser.name} ↔ ${slackMember.real_name} (${slackMember.id})`)
      mapped++
    } else {
      console.log(`❓ Pas de correspondance Pulse pour : ${slackMember.real_name} (${slackMember.id})`)
    }
  }

  console.log(`\n✅ ${mapped}/${pulseUsers.length} utilisateurs mappés`)
}

main()
  .catch(console.error)
  .finally(() => { pool.end(); prisma.$disconnect() })
