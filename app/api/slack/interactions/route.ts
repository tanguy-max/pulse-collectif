import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_LABELS: Record<string, string> = {
  SUN:   "☀️ Au top",
  CLOUD: "⛅ Correct",
  RAIN:  "🌧️ Difficile",
  STORM: "⛈️ Épuisé·e",
  FOG:   "🌫️ Flou",
}

const AUDIENCE_OPTIONS = [
  { text: { type: "plain_text", text: "👥 Équipe" }, value: "TEAM" },
  { text: { type: "plain_text", text: "🎯 Lead" },   value: "LEAD" },
  { text: { type: "plain_text", text: "🔒 Privé" },  value: "PRIVATE" },
]

const BOT_TOKEN = () => process.env.SLACK_BOT_TOKEN!
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? "https://pulse-collectif-production.up.railway.app"

// Ouvrir la modale Slack
async function openModal(triggerId: string, mood: string, slackUserId: string) {
  const moodLabel = MOOD_LABELS[mood]
  const modal = {
    type: "modal",
    callback_id: "meteo_submit",
    private_metadata: JSON.stringify({ mood, slackUserId }),
    title: { type: "plain_text", text: "Ma météo du jour" },
    submit: { type: "plain_text", text: "Envoyer" },
    close:  { type: "plain_text", text: "Annuler" },
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `Humeur choisie : *${moodLabel}*` },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "context_block",
        optional: true,
        label: { type: "plain_text", text: "Contexte (optionnel)" },
        element: {
          type: "plain_text_input",
          action_id: "context_text",
          multiline: true,
          placeholder: { type: "plain_text", text: "Qu'est-ce qui influence ton humeur ?" },
        },
      },
      {
        type: "input",
        block_id: "context_audience_block",
        optional: true,
        label: { type: "plain_text", text: "Contexte visible par" },
        element: {
          type: "static_select",
          action_id: "context_audience",
          initial_option: AUDIENCE_OPTIONS[0],
          options: AUDIENCE_OPTIONS,
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "blocker_block",
        optional: true,
        label: { type: "plain_text", text: "Bloqueur (optionnel)" },
        element: {
          type: "plain_text_input",
          action_id: "blocker_text",
          multiline: true,
          placeholder: { type: "plain_text", text: "Un obstacle, un frein qui coince ?" },
        },
      },
      {
        type: "input",
        block_id: "blocker_audience_block",
        optional: true,
        label: { type: "plain_text", text: "Bloqueur visible par" },
        element: {
          type: "static_select",
          action_id: "blocker_audience",
          initial_option: AUDIENCE_OPTIONS[0],
          options: AUDIENCE_OPTIONS,
        },
      },
    ],
  }

  await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${BOT_TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trigger_id: triggerId, view: modal }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const payloadStr = params.get("payload")
  if (!payloadStr) return new NextResponse("ok")

  const payload = JSON.parse(payloadStr)

  // ── Clic sur un bouton météo ──────────────────────────────────────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0]
    if (!action?.action_id?.startsWith("meteo_")) return new NextResponse("ok")

    const slackUserId = payload.user?.id
    const mood = action.action_id.replace("meteo_", "")

    // Vérifier que l'utilisateur existe dans Pulse
    const user = await prisma.user.findFirst({ where: { slackUserId } })
    if (!user) {
      return NextResponse.json({
        replace_original: true,
        text: "❌ Compte non lié. Connecte-toi une fois sur l'app Pulse puis réessaie.",
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
        text: `✅ Météo déjà enregistrée aujourd'hui : ${MOOD_LABELS[existing.mood]}`,
      })
    }

    // Ouvrir la modale
    await openModal(payload.trigger_id, mood, slackUserId)
    return new NextResponse("ok")
  }

  // ── Soumission de la modale ───────────────────────────────────────────────
  if (payload.type === "view_submission") {
    const { mood, slackUserId } = JSON.parse(payload.view.private_metadata)
    const values = payload.view.state.values

    const contextText     = values?.context_block?.context_text?.value?.trim() || null
    const contextAudience = values?.context_audience_block?.context_audience?.selected_option?.value || "TEAM"
    const blockerText     = values?.blocker_block?.blocker_text?.value?.trim() || null
    const blockerAudience = values?.blocker_audience_block?.blocker_audience?.selected_option?.value || "TEAM"

    const user = await prisma.user.findFirst({ where: { slackUserId } })
    if (!user) return NextResponse.json({ response_action: "clear" })

    await prisma.meteo.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        mood,
        contextText,
        contextAudience: contextAudience as "TEAM" | "LEAD" | "PRIVATE",
        blockerText,
        blockerAudience: blockerAudience as "TEAM" | "LEAD" | "PRIVATE",
      },
    })

    // Post dans Slack si contexte partagé avec l'équipe
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const lines = [`*${user.name}* — ${MOOD_LABELS[mood]}`]
      if (contextText && contextAudience === "TEAM") lines.push(`> ${contextText}`)
      if (blockerText && blockerAudience === "TEAM") lines.push(`> 🚧 ${blockerText}`)
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines.join("\n") }),
      }).catch(() => {})
    }

    // Fermer la modale avec un message de confirmation
    return NextResponse.json({
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Météo enregistrée ✅" },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Merci *${user.name}* ! Ta météo *${MOOD_LABELS[mood]}* a été partagée.\n\n👉 <${APP_URL}/fil|Voir le fil d'équipe>`,
            },
          },
        ],
      },
    })
  }

  return new NextResponse("ok")
}
