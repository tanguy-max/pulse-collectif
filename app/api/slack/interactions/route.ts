import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_LABELS: Record<string, string> = {
  SUN:   "☀️ Au top",
  CLOUD: "⛅ Correct",
  RAIN:  "🌧️ Difficile",
  STORM: "⛈️ Épuisé·e",
  FOG:   "🌫️ Flou",
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pulse-collectif-production.up.railway.app"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const payloadStr = params.get("payload")
  if (!payloadStr) return new NextResponse("ok")

  const payload = JSON.parse(payloadStr)
  const action = payload.actions?.[0]
  if (!action?.action_id?.startsWith("meteo_")) return new NextResponse("ok")

  const slackUserId = payload.user?.id
  const mood = action.action_id.replace("meteo_", "")

  // Trouver l'utilisateur Pulse via son Slack ID
  const user = await prisma.user.findFirst({ where: { slackUserId } })
  if (!user) {
    return NextResponse.json({
      replace_original: true,
      text: "❌ Ton compte Slack n'est pas encore lié à Pulse. Connecte-toi une fois sur l'app puis réessaie.",
    })
  }

  // Vérifier si déjà soumis aujourd'hui
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const existing = await prisma.meteo.findFirst({
    where: { userId: user.id, createdAt: { gte: start, lte: end } },
  })

  if (existing) {
    return NextResponse.json({
      replace_original: true,
      text: `✅ Tu as déjà partagé ta météo aujourd'hui : ${MOOD_LABELS[existing.mood]}`,
    })
  }

  // Créer la météo
  await prisma.meteo.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      mood,
      contextAudience: "TEAM",
      blockerAudience: "TEAM",
    },
  })

  return NextResponse.json({
    replace_original: true,
    text: `✅ Météo enregistrée : ${MOOD_LABELS[mood]}\nMerci ${user.name} ! 👉 ${APP_URL}/fil`,
  })
}
