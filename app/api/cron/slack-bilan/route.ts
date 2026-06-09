import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_BLOCKS = {
  type: "actions",
  elements: [
    { type: "button", text: { type: "plain_text", text: "🌟 Super"       }, action_id: "bilan_SUN",   style: "primary" },
    { type: "button", text: { type: "plain_text", text: "👍 Normale"     }, action_id: "bilan_CLOUD" },
    { type: "button", text: { type: "plain_text", text: "😐 Bof"         }, action_id: "bilan_FOG"   },
    { type: "button", text: { type: "plain_text", text: "😰 Stressante"  }, action_id: "bilan_RAIN"  },
    { type: "button", text: { type: "plain_text", text: "😴 Fatiguante"  }, action_id: "bilan_STORM", style: "danger" },
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

  // DMs individuels
  const users = await prisma.user.findMany({
    where: { slackUserId: { not: null } },
  })

  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text: "📋 *Ta semaine, c'était comment ?*" },
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
