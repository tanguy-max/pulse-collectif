import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sessionOptions, type SessionData } from "@/lib/session"

const MOOD_LABELS: Record<string, string> = {
  SUN:   "☀️ Au top",
  CLOUD: "⛅ Correct",
  RAIN:  "🌧️ Difficile",
  STORM: "⛈️ Épuisé·e",
  FOG:   "🌫️ Flou",
  ANGER: "😤 Mauvaise humeur",
}

async function postToSlack(name: string, mood: string, contextText?: string | null, blockerText?: string | null) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const moodLabel = MOOD_LABELS[mood] ?? mood
  const lines = [`*${name}* vient de partager sa météo : ${moodLabel}`]
  if (contextText) lines.push(`> ${contextText}`)
  if (blockerText) lines.push(`> 🚧 ${blockerText}`)

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  }).catch(() => {}) // ne pas bloquer si Slack est indisponible
}

function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start, end }
}

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { start, end } = todayRange()
  const existing = await prisma.meteo.findFirst({
    where: { userId: session.userId, createdAt: { gte: start, lte: end } },
  })
  return NextResponse.json({ submitted: !!existing, meteo: existing })
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { mood, contextText, contextAudience, blockerText, blockerAudience } = await req.json()

  if (!mood) return NextResponse.json({ error: "Humeur requise" }, { status: 400 })

  const validMoods = ["SUN", "CLOUD", "RAIN", "STORM", "FOG", "ANGER"]
  const validAudiences = ["TEAM", "LEAD", "PRIVATE"]
  if (!validMoods.includes(mood)) return NextResponse.json({ error: "Humeur invalide" }, { status: 400 })
  if (contextAudience && !validAudiences.includes(contextAudience)) {
    return NextResponse.json({ error: "Audience invalide" }, { status: 400 })
  }
  if (blockerAudience && !validAudiences.includes(blockerAudience)) {
    return NextResponse.json({ error: "Audience invalide" }, { status: 400 })
  }

  const { start, end } = todayRange()
  const existing = await prisma.meteo.findFirst({
    where: { userId: session.userId, createdAt: { gte: start, lte: end } },
  })
  if (existing) return NextResponse.json({ error: "Déjà soumis aujourd'hui" }, { status: 409 })

  const meteo = await prisma.meteo.create({
    data: {
      userId: session.userId,
      teamId: session.teamId,
      mood,
      contextText: contextText?.trim() || null,
      contextAudience: contextAudience || "TEAM",
      blockerText: blockerText?.trim() || null,
      blockerAudience: blockerAudience || "TEAM",
    },
  })

  // Post Slack uniquement si le contexte est partagé avec l'équipe
  const sharedContext = contextAudience === "TEAM" ? contextText : null
  const sharedBlocker = blockerAudience === "TEAM" ? blockerText : null
  postToSlack(session.userName, mood, sharedContext, sharedBlocker)

  return NextResponse.json({ ok: true, meteo })
}
