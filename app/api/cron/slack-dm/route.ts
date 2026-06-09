import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_BLOCKS = {
  type: "actions",
  elements: [
    { type: "button", text: { type: "plain_text", text: "☀️ Au top"          }, action_id: "meteo_SUN",   style: "primary" },
    { type: "button", text: { type: "plain_text", text: "⛅ Correct"         }, action_id: "meteo_CLOUD" },
    { type: "button", text: { type: "plain_text", text: "🌧️ Difficile"      }, action_id: "meteo_RAIN"  },
    { type: "button", text: { type: "plain_text", text: "⛈️ Mal dormi"    }, action_id: "meteo_STORM", style: "danger" },
    { type: "button", text: { type: "plain_text", text: "🌫️ Stressé·e"     }, action_id: "meteo_FOG"   },
    { type: "button", text: { type: "plain_text", text: "😤 Mauvaise humeur" }, action_id: "meteo_ANGER", style: "danger" },
  ],
}

export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  // Sécurité basique : vérifier le secret dans le header ou query param
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const botToken = process.env.SLACK_BOT_TOKEN
  if (!botToken) return NextResponse.json({ error: "No bot token" }, { status: 500 })

  const users = await prisma.user.findMany({
    where: { slackUserId: { not: null } },
  })

  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text: "🌤️ *Comment tu vas aujourd'hui ?*\nClique sur ton humeur pour partager ta météo en un clic :" },
    },
    MOOD_BLOCKS,
  ]

  let sent = 0
  for (const user of users) {
    // Ouvrir le canal DM
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ users: user.slackUserId }),
    })
    const { channel } = await openRes.json()
    if (!channel?.id) continue

    // Envoyer le message
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channel.id, blocks, text: "🌤️ Comment tu vas aujourd'hui ?" }),
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
