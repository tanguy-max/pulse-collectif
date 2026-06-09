import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MOOD_LABELS: Record<string, string> = {
  SUN:   "☀️ Au top",
  CLOUD: "⛅ Correct",
  RAIN:  "🌧️ Difficile",
  STORM: "⛈️ Mal dormi",
  FOG:   "🌫️ Stressé·e",
  ANGER: "😤 Mauvaise humeur",
}

const AUDIENCE_OPTIONS = [
  { text: { type: "plain_text", text: "👥 Équipe" }, value: "TEAM"    },
  { text: { type: "plain_text", text: "🎯 Lead"   }, value: "LEAD"    },
  { text: { type: "plain_text", text: "🔒 Privé"  }, value: "PRIVATE" },
]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pulse-collectif-production.up.railway.app"

const BILAN_LABELS: Record<string, string> = {
  SUN: "☀️ Super semaine", CLOUD: "⛅ Correcte", RAIN: "🌧️ Difficile",
  STORM: "⛈️ Mal dormi", FOG: "🌫️ Stressé·e", ANGER: "😤 Mauvaise humeur",
}

async function saveBilan(user: { id: string; teamId: string; name: string }, state: Record<string, string | null>) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  await prisma.meteo.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      mood: state.mood as string,
      weekHighlight: state.highlightText ?? null,
      weekSummary: state.summaryText ?? null,
      contextAudience: "TEAM",
      blockerAudience: "TEAM",
    },
  })

  await prisma.user.update({ where: { id: user.id }, data: { slackConvState: null } })

  // Post dans #1-standup
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (webhookUrl) {
    const lines = [`📋 *Bilan de ${user.name}* — ${BILAN_LABELS[state.mood as string]}`]
    if (state.highlightText) lines.push(`> ✨ ${state.highlightText}`)
    if (state.summaryText)   lines.push(`> 💡 ${state.summaryText}`)
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    }).catch(() => {})
  }

  // Confirmation DM
  const botToken = process.env.SLACK_BOT_TOKEN
  if (botToken && user) {
    const pulseUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (pulseUser?.slackUserId) {
      const openRes = await fetch("https://slack.com/api/conversations.open", {
        method: "POST",
        headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ users: pulseUser.slackUserId }),
      })
      const { channel } = await openRes.json()
      if (channel?.id) {
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: channel.id,
            text: `✅ Noté !\n📹 *Enregistre ton clip vidéo dans #1-standup* pour partager ta semaine avec l'équipe 👆`,
          }),
        })
      }
    }
  }
}

async function notifyLeads(
  memberName: string,
  mood: string,
  teamId: string,
  contextText: string | null,
  contextAudience: string,
  blockerText: string | null,
  blockerAudience: string,
) {
  const botToken = process.env.SLACK_BOT_TOKEN
  if (!botToken) return

  const hasLeadContent =
    (contextText && contextAudience === "LEAD") ||
    (blockerText && blockerAudience === "LEAD")
  if (!hasLeadContent) return

  const leads = await prisma.user.findMany({
    where: { teamId, role: "LEAD", slackUserId: { not: null } },
  })

  const lines = [`🎯 *Message pour les leads — ${memberName}* (${MOOD_LABELS[mood]})`]
  if (contextText && contextAudience === "LEAD") lines.push(`> ${contextText}`)
  if (blockerText  && blockerAudience === "LEAD") lines.push(`> 🚧 ${blockerText}`)
  const text = lines.join("\n")

  for (const lead of leads) {
    if (lead.name === memberName) continue // pas de notif à soi-même
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ users: lead.slackUserId }),
    })
    const { channel } = await openRes.json()
    if (!channel?.id) continue
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channel.id, text }),
    })
  }
}

function buildModal(mood: string, slackUserId: string) {
  return {
    type: "modal",
    callback_id: "meteo_submit",
    private_metadata: JSON.stringify({ mood, slackUserId }),
    title:  { type: "plain_text", text: "Ma météo du jour" },
    submit: { type: "plain_text", text: "Envoyer ✅" },
    close:  { type: "plain_text", text: "Annuler" },
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `Humeur : *${MOOD_LABELS[mood]}*` },
      },
      { type: "divider" },
      {
        type: "input", block_id: "context_block", optional: true,
        label: { type: "plain_text", text: "Contexte (optionnel)" },
        element: {
          type: "plain_text_input", action_id: "context_text", multiline: true,
          placeholder: { type: "plain_text", text: "Qu'est-ce qui influence ton humeur ?" },
        },
      },
      {
        type: "input", block_id: "context_audience_block", optional: true,
        label: { type: "plain_text", text: "Contexte visible par" },
        element: {
          type: "static_select", action_id: "context_audience",
          initial_option: AUDIENCE_OPTIONS[0], options: AUDIENCE_OPTIONS,
        },
      },
      { type: "divider" },
      {
        type: "input", block_id: "blocker_block", optional: true,
        label: { type: "plain_text", text: "Bloqueur (optionnel)" },
        element: {
          type: "plain_text_input", action_id: "blocker_text", multiline: true,
          placeholder: { type: "plain_text", text: "Un obstacle, un frein ?" },
        },
      },
      {
        type: "input", block_id: "blocker_audience_block", optional: true,
        label: { type: "plain_text", text: "Bloqueur visible par" },
        element: {
          type: "static_select", action_id: "blocker_audience",
          initial_option: AUDIENCE_OPTIONS[0], options: AUDIENCE_OPTIONS,
        },
      },
    ],
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const payloadStr = params.get("payload")
  if (!payloadStr) return new NextResponse("ok")

  const payload = JSON.parse(payloadStr)

  // ── Clic bouton bilan → démarrer flux bilan ──────────────────────────────
  if (payload.type === "block_actions" && payload.actions?.[0]?.action_id?.startsWith("bilan_")) {
    const action      = payload.actions[0]
    const mood        = action.action_id.replace("bilan_", "")
    const slackUserId = payload.user?.id
    const channel     = payload.channel?.id

    const user = await prisma.user.findFirst({ where: { slackUserId } })
    if (!user) return new NextResponse("ok")

    const BILAN_LABELS: Record<string, string> = {
      SUN: "☀️ Super semaine", CLOUD: "⛅ Correcte", RAIN: "🌧️ Difficile",
      STORM: "⛈️ Mal dormi", FOG: "🌫️ Stressé·e", ANGER: "😤 Mauvaise humeur",
    }

    // Sauvegarder le bilan directement avec juste l'humeur
    await saveBilan(user, { mood, highlightText: null, summaryText: null })
    return new NextResponse("ok")
  }

  // ── Clic bouton météo → ouvrir modale IMMÉDIATEMENT ──────────────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0]
    if (!action?.action_id?.startsWith("meteo_")) return new NextResponse("ok")

    const mood        = action.action_id.replace("meteo_", "")
    const slackUserId = payload.user?.id
    const triggerId   = payload.trigger_id

    // Ouvrir la modale — on attend la réponse Slack avant de retourner
    const result = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trigger_id: triggerId, view: buildModal(mood, slackUserId) }),
    }).then(r => r.json()).catch(() => ({ ok: false }))

    if (!result.ok) {
      console.error("views.open error:", JSON.stringify(result))
    }

    return new NextResponse("ok")
  }

  // ── Soumission modale ─────────────────────────────────────────────────────
  if (payload.type === "view_submission") {
    const { mood, slackUserId } = JSON.parse(payload.view.private_metadata)
    const values = payload.view.state.values

    const contextText     = values?.context_block?.context_text?.value?.trim() || null
    const contextAudience = values?.context_audience_block?.context_audience?.selected_option?.value || "TEAM"
    const blockerText     = values?.blocker_block?.blocker_text?.value?.trim() || null
    const blockerAudience = values?.blocker_audience_block?.blocker_audience?.selected_option?.value || "TEAM"

    const user = await prisma.user.findFirst({ where: { slackUserId } })
    if (!user) return NextResponse.json({ response_action: "clear" })

    // Vérifier déjà soumis
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const existing = await prisma.meteo.findFirst({
      where: { userId: user.id, createdAt: { gte: start, lte: end } },
    })
    if (existing) {
      return NextResponse.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Déjà enregistrée ✅" },
          blocks: [{
            type: "section",
            text: { type: "mrkdwn", text: `Tu as déjà partagé ta météo : *${MOOD_LABELS[existing.mood]}*` },
          }],
        },
      })
    }

    // Sauvegarder
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

    // Post canal Slack si partagé équipe
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const lines = [`*${user.name}* — ${MOOD_LABELS[mood]}`]
      if (contextText && contextAudience === "TEAM") lines.push(`> ${contextText}`)
      if (blockerText  && blockerAudience === "TEAM") lines.push(`> 🚧 ${blockerText}`)
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines.join("\n") }),
      }).catch(() => {})
    }

    // DM aux leads si contenu partagé en "Lead"
    await notifyLeads(user.name, mood, user.teamId, contextText, contextAudience, blockerText, blockerAudience)

    return NextResponse.json({
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Météo enregistrée ✅" },
        blocks: [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Merci *${user.name}* ! Ta météo *${MOOD_LABELS[mood]}* est partagée.\n\n👉 <${APP_URL}/fil|Voir le fil d'équipe>`,
          },
        }],
      },
    })
  }

  return new NextResponse("ok")
}
