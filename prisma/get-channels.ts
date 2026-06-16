import "dotenv/config"

async function main() {
  const res = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100", {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  })
  const { channels } = await res.json()
  channels
    ?.filter((c: any) => c.name?.includes("standup") || c.name?.includes("general") || c.name?.includes("général"))
    .forEach((c: any) => console.log(`#${c.name} → ${c.id}`))

  console.log("\nTous les canaux :")
  channels?.forEach((c: any) => console.log(`  #${c.name} → ${c.id}`))
}

main().catch(console.error)
