import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sessionOptions, type SessionData } from "@/lib/session"

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const gratitudes = await prisma.gratitude.findMany({
    where: { teamId: session.teamId, createdAt: { gte: weekStart } },
    include: { fromUser: true, toUser: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ gratitudes })
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { toUserId, tags, message } = await req.json()

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return NextResponse.json({ error: "Au moins un tag requis" }, { status: 400 })
  }

  const gratitude = await prisma.gratitude.create({
    data: {
      fromUserId: session.userId,
      toUserId: toUserId || null,
      teamId: session.teamId,
      tags: JSON.stringify(tags),
      message: message?.trim() || null,
    },
    include: { fromUser: true, toUser: true },
  })

  return NextResponse.json({ ok: true, gratitude })
}
