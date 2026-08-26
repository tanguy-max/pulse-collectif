import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function slackPost(endpoint: string, body: object) {
  return fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then(r => r.json())
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // 1. Test channels:history scope
  const historyRes = await slackPost("conversations.history", {
    channel: "C02GDFCA6G7",
    limit: 3,
  })
  results.history_ok = historyRes.ok
  results.history_error = historyRes.error
  results.messages = historyRes.messages?.map((m: any) => ({ ts: m.ts, text: m.text?.slice(0, 60) }))

  // 2. Test notification to Tanguy
  const tanguy = await prisma.user.findFirst({ where: { name: "Tanguy" } })
  results.tanguy_found = !!tanguy
  results.tanguy_slackId = tanguy?.slackUserId

  if (tanguy?.slackUserId) {
    const openRes = await slackPost("conversations.open", { users: tanguy.slackUserId })
    results.dm_channel = openRes.channel?.id

    if (openRes.channel?.id) {
      const sendRes = await slackPost("chat.postMessage", {
        channel: openRes.channel.id,
        text: "🔧 Test notif — si tu vois ce message, les notifications fonctionnent !",
      })
      results.dm_sent = sendRes.ok
      results.dm_error = sendRes.error
    }
  }

  return NextResponse.json(results)
}
