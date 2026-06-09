import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_BLOCKS = {
  type: "actions",
  elements: [
    { type: "button", text: { type: "plain_text", text: "☀️ Super semaine"   }, action_id: "bilan_SUN",   style: "primary" },
    { type: "button", text: { type: "plain_text", text: "⛅ Correcte"        }, action_id: "bilan_CLOUD" },
    { type: "button", text: { type: "plain_text", text: "🌧️ Difficile"      }, action_id: "bilan_RAIN"  },
    { type: "button", text: { type: "plain_text", text: "⛈️ Mal dormi"      }, action_id: "bilan_STORM", style: "danger" },
    { type: "button", text: { type: "plain_text", text: "🌫️ Stressé·e"     }, action_id: "bilan_FOG"   },
    { type: "button", text: { type: "plain_text", text: "😤 Mauvaise humeur" }, action_id: "bilan_ANGER", style: "danger" },
  ],
}

export async function GET(req: NextRequest) { return handler(req) }
export async function POST(req: NextRequest) { return handler(req) }

async function handler(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const botToken = process.env.SLACK_BOT_TOKEN
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!botToken) return NextResponse.json({ error: "No bot token" }, { status: 500 })

  // Message dans #1-standup pour les clips vidéo
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "📋 *Bilan de semaine !*\n📹 Partagez votre clip vidéo directement ici (bouton 📷 dans la barre de message)\nVous recevez aussi un DM pour le bilan texte 👇",
      }),
    }).catch(() => {})
  }

  // DMs individuels pour le bilan texte
  const users = await prisma.user.findMany({
    where: { slackUserId: { not: null } },
  })

  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text: "📋 *C'était comment cette semaine ?*\nClique sur ton humeur de fin de semaine :" },
    },
    MOOD_BLOCKS,
  ]

  let sent = 0
  for (const user of users) {
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ users: user.slackUserId }),
    })
    const { channel } = await openRes.json()
    if (!channel?.id) continue

    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channel.id, blocks, text: "📋 C'était comment cette semaine ?" }),
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
