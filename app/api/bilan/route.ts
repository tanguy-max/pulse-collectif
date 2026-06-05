import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sessionOptions, type SessionData } from "@/lib/session"

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { mood, weekHighlight, highlightAudience, weekSummary, summaryAudience } = await req.json()
  if (!mood) return NextResponse.json({ error: "Humeur requise" }, { status: 400 })

  const validMoods = ["SUN", "CLOUD", "RAIN", "STORM", "FOG"]
  if (!validMoods.includes(mood)) return NextResponse.json({ error: "Humeur invalide" }, { status: 400 })

  const meteo = await prisma.meteo.create({
    data: {
      userId: session.userId,
      teamId: session.teamId,
      mood,
      // "Ce que j'emporte"
      contextText: weekSummary?.trim() || null,
      contextAudience: summaryAudience || "TEAM",
      // "Moment marquant"
      blockerText: weekHighlight?.trim() || null,
      blockerAudience: highlightAudience || "TEAM",
      weekHighlight: weekHighlight?.trim() || null,
      weekSummary: weekSummary?.trim() || null,
    },
  })

  return NextResponse.json({ ok: true, meteoId: meteo.id })
}
