import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { start, end }
}

function yesterdayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
  return { start, end }
}

export async function GET() {
  const session = await requireAuth()
  const { start, end } = todayRange()
  const yest = yesterdayRange()

  const [teamTasks, yesterdayUnchecked] = await Promise.all([
    prisma.task.findMany({
      where: { teamId: session.teamId, date: { gte: start, lte: end } },
      include: { user: { select: { id: true, name: true, initials: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { userId: session.userId, done: false, date: { gte: yest.start, lte: yest.end } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return NextResponse.json({ tasks: teamTasks, yesterdayUnchecked })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const { texts } = await req.json()
  if (!texts || texts.length === 0) return NextResponse.json({ ok: true })

  const { start } = todayRange()
  const validTexts: string[] = texts.map((t: string) => t.trim()).filter(Boolean)
  if (validTexts.length === 0) return NextResponse.json({ ok: true })

  await prisma.task.createMany({
    data: validTexts.map((text) => ({
      userId: session.userId,
      teamId: session.teamId,
      text,
      date: start,
    })),
  })

  // Post dans #1-standup
  const botToken = process.env.SLACK_BOT_TOKEN
  if (botToken) {
    const lines = [`📋 *${session.userName}* — tâches du jour`, ...validTexts.map(t => `• ${t}`)]
    fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "C02GDFCA6G7", text: lines.join("\n") }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
