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

async function sendDM(channel: string, text: string, blocks?: object[]) {
  return slackPost("chat.postMessage", { channel, text, ...(blocks ? { blocks } : {}) })
}

function skipButton(actionId: string, label = "Passer →") {
  return [{
    type: "actions",
    elements: [{ type: "button", text: { type: "plain_text", text: label }, action_id: actionId }],
  }]
}

function audienceButtons(prefix: string) {
  return [{
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "👥 Équipe" }, action_id: `${prefix}_TEAM`    },
      { type: "button", text: { type: "plain_text", text: "🎯 Lead"   }, action_id: `${prefix}_LEAD`    },
      { type: "button", text: { type: "plain_text", text: "🔒 Privé"  }, action_id: `${prefix}_PRIVATE` },
    ],
  }]
}

async function saveMeteo(user: { id: string; teamId: string; name: string; slackConvState: string | null }, channel: string) {
  const state = JSON.parse(user.slackConvState ?? "{}")

  await prisma.meteo.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      mood: state.mood,
      contextText:     state.contextText     ?? null,
      contextAudience: state.contextAudience ?? "TEAM",
      blockerText:     state.blockerText     ?? null,
      blockerAudience: state.blockerAudience ?? "TEAM",
    },
  })

  await prisma.user.update({ where: { id: user.id }, data: { slackConvState: null } })

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (webhookUrl) {
    const lines = [`*${user.name}* — ${MOOD_LABELS[state.mood]}`]
    if (state.contextText && state.contextAudience === "TEAM") lines.push(`> ${state.contextText}`)
    if (state.blockerText  && state.blockerAudience === "TEAM") lines.push(`> 🚧 ${state.blockerText}`)
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    }).catch(() => {})
  }

  await sendDM(channel, `✅ Météo enregistrée : ${MOOD_LABELS[state.mood]}\nMerci ${user.name} ! 👉 ${APP_URL}/fil`)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const payloadStr = params.get("payload")
  if (!payloadStr) return new NextResponse("ok")

  const payload = JSON.parse(payloadStr)
  if (payload.type !== "block_actions") return new NextResponse("ok")

  const action      = payload.actions?.[0]
  const actionId    = action?.action_id as string
  const slackUserId = payload.user?.id
  const channel     = payload.channel?.id

  if (!actionId || !slackUserId) return new NextResponse("ok")

  const user = await prisma.user.findFirst({ where: { slackUserId } })
  if (!user) return new NextResponse("ok")

  const state = user.slackConvState ? JSON.parse(user.slackConvState) : {}

  // ── Sélection de l'humeur ─────────────────────────────────────────────────
  if (actionId.startsWith("meteo_")) {
    const mood = actionId.replace("meteo_", "")
    const moodLabel = MOOD_LABELS[mood]

    // Vérifier si déjà soumis aujourd'hui
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const existing = await prisma.meteo.findFirst({ where: { userId: user.id, createdAt: { gte: start, lte: end } } })
    if (existing) {
      sendDM(channel, `✅ Tu as déjà partagé ta météo aujourd'hui : ${MOOD_LABELS[existing.mood]}`)
      return new NextResponse("ok")
    }

    const newState = { step: "WAITING_CONTEXT", mood, channel }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })

    sendDM(channel,
      `${moodLabel} noté ! Un contexte à partager ? _(écris ici ou clique Passer)_`,
      skipButton("skip_context")
    )
    return new NextResponse("ok")
  }

  // ── Passer le contexte ────────────────────────────────────────────────────
  if (actionId === "skip_context") {
    const newState = { ...state, step: "WAITING_BLOCKER", contextText: null }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    sendDM(channel, `Un bloqueur à signaler ? _(écris ici ou clique Passer)_`, skipButton("skip_blocker"))
    return new NextResponse("ok")
  }

  // ── Audience du contexte ──────────────────────────────────────────────────
  if (actionId.startsWith("aud_context_")) {
    const audience = actionId.replace("aud_context_", "") as "TEAM" | "LEAD" | "PRIVATE"
    const newState = { ...state, step: "WAITING_BLOCKER", contextAudience: audience }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    sendDM(channel, `Parfait ! Un bloqueur à signaler ? _(écris ici ou clique Passer)_`, skipButton("skip_blocker"))
    return new NextResponse("ok")
  }

  // ── Passer le bloqueur → sauvegarder ─────────────────────────────────────
  if (actionId === "skip_blocker") {
    const newState = { ...state, blockerText: null }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    await saveMeteo({ ...user, slackConvState: JSON.stringify(newState) }, channel)
    return new NextResponse("ok")
  }

  // ── Audience du bloqueur → sauvegarder ───────────────────────────────────
  if (actionId.startsWith("aud_blocker_")) {
    const audience = actionId.replace("aud_blocker_", "") as "TEAM" | "LEAD" | "PRIVATE"
    const newState = { ...state, blockerAudience: audience }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    await saveMeteo({ ...user, slackConvState: JSON.stringify(newState) }, channel)
    return new NextResponse("ok")
  }

  return new NextResponse("ok")
}
