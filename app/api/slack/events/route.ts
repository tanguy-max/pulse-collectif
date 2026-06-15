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

function audienceButtons(prefix: string) {
  return [{
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "👥 Équipe" }, action_id: `${prefix}_TEAM`  },
      { type: "button", text: { type: "plain_text", text: "🎯 Lead"   }, action_id: `${prefix}_LEAD`  },
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

  // Post canal Slack si partagé équipe
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

  await sendDM(channel,
    `✅ Météo enregistrée : ${MOOD_LABELS[state.mood]}\nMerci ${user.name} ! 👉 ${APP_URL}/fil`
  )
}

export async function POST(req: NextRequest) {
  const payload = await req.json()

  // Vérification URL Slack
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge })
  }

  if (payload.type !== "event_callback") return NextResponse.json({ ok: true })

  const event = payload.event
  if (event.type !== "message" || event.channel_type !== "im" || event.bot_id) {
    return NextResponse.json({ ok: true })
  }

  const slackUserId = event.user
  const channel     = event.channel

  // ── Fichier vidéo dans le DM → repost dans standup ───────────────────────
  const files: any[] = event.files ?? []
  const videoFile = files.find((f: any) =>
    f.mimetype?.startsWith("video/") || f.filetype === "mp4" || f.filetype === "webm" || f.filetype === "mov"
  )

  if (videoFile) {
    const user = await prisma.user.findFirst({ where: { slackUserId } })
    if (user) {
      // Récupérer le bilan de la semaine pour afficher la météo
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      weekStart.setHours(0, 0, 0, 0)
      const recentBilan = await prisma.meteo.findFirst({
        where: { userId: user.id, createdAt: { gte: weekStart }, weekHighlight: null, weekSummary: null },
        orderBy: { createdAt: "desc" },
      })
      const BILAN_LABELS: Record<string, string> = {
        SUN: "🌟 Super", CLOUD: "👍 Normale", FOG: "😐 Bof",
        RAIN: "😰 Stressante", STORM: "😴 Fatiguante", ANGER: "😤 Mauvaise humeur",
      }
      const moodLabel = recentBilan ? BILAN_LABELS[recentBilan.mood] ?? "" : ""
      const bilanLine = moodLabel ? `Semaine : *${moodLabel}*` : ""

      const botToken = process.env.SLACK_BOT_TOKEN!

      // Les events Slack envoient des stubs — récupérer les infos complètes via GET
      let urlPrivate: string | undefined = videoFile.url_private
      let fileName: string = videoFile.name ?? "bilan.mp4"
      if (!urlPrivate) {
        const infoRes = await fetch(
          `https://slack.com/api/files.info?file=${videoFile.id}`,
          { headers: { Authorization: `Bearer ${botToken}` } }
        ).then(r => r.json())
        urlPrivate = infoRes.file?.url_private
        fileName   = infoRes.file?.name ?? fileName
      }

      let posted = false

      if (urlPrivate) {
        try {
          const videoRes = await fetch(urlPrivate, {
            headers: { Authorization: `Bearer ${botToken}` },
          })
          const videoBuffer = await videoRes.arrayBuffer()

          const uploadUrlRes = await slackPost("files.getUploadURLExternal", {
            filename: fileName,
            length: videoBuffer.byteLength,
          })

          if (uploadUrlRes.ok) {
            await fetch(uploadUrlRes.upload_url, {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: videoBuffer,
            })
            const completeRes = await slackPost("files.completeUploadExternal", {
              files: [{ id: uploadUrlRes.file_id, title: `📹 ${user.name} — bilan de semaine` }],
              channel_id: "C02GDFCA6G7",
              initial_comment: [`📹 *${user.name}* — bilan de semaine`, bilanLine].filter(Boolean).join("\n"),
            })
            if (completeRes.ok) posted = true
            else console.error("[video] completeUploadExternal:", completeRes.error)
          } else {
            console.error("[video] getUploadURLExternal:", uploadUrlRes.error)
          }
        } catch (err) {
          console.error("[video] erreur upload:", err)
        }
      }

      // Fallback : poster au moins le permalink si l'upload échoue
      if (!posted) {
        await slackPost("chat.postMessage", {
          channel: "C02GDFCA6G7",
          text: [`📹 *${user.name}* — bilan de semaine`, bilanLine, videoFile.permalink].filter(Boolean).join("\n"),
        })
      }
    }
    return NextResponse.json({ ok: true })
  }

  const text = event.text?.trim()
  if (!text || event.subtype) return NextResponse.json({ ok: true })

  const user = await prisma.user.findFirst({ where: { slackUserId } })
  if (!user?.slackConvState) return NextResponse.json({ ok: true })

  const state = JSON.parse(user.slackConvState)

  // ── WAITING_CONTEXT : l'utilisateur tape son contexte ───────────────────
  if (state.step === "WAITING_CONTEXT") {
    const newState = { ...state, step: "WAITING_CONTEXT_AUD", contextText: text }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    await sendDM(channel, `_"${text}"_\nVisible par qui ?`, audienceButtons("aud_context"))
    return NextResponse.json({ ok: true })
  }

  // ── WAITING_BLOCKER : l'utilisateur tape son bloqueur ───────────────────
  if (state.step === "WAITING_BLOCKER") {
    const newState = { ...state, step: "WAITING_BLOCKER_AUD", blockerText: text }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    await sendDM(channel, `_"${text}"_\nBloqueur visible par qui ?`, audienceButtons("aud_blocker"))
    return NextResponse.json({ ok: true })
  }

  // ── BILAN_WAITING_HIGHLIGHT : moment marquant ────────────────────────────
  if (state.step === "BILAN_WAITING_HIGHLIGHT") {
    const newState = { ...state, step: "BILAN_WAITING_SUMMARY", highlightText: text }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(newState) } })
    await sendDM(channel, `_"${text}"_ ✨\nCe que tu emportes de cette semaine ? _(écris ici ou clique Passer)_`, [{
      type: "actions",
      elements: [{ type: "button", text: { type: "plain_text", text: "Passer →" }, action_id: "skip_summary" }],
    }])
    return NextResponse.json({ ok: true })
  }

  // ── BILAN_WAITING_SUMMARY : ce que j'emporte ─────────────────────────────
  if (state.step === "BILAN_WAITING_SUMMARY") {
    const finalState = { ...state, summaryText: text }
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: JSON.stringify(finalState) } })
    // Import saveBilan logic inline
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    await prisma.meteo.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        mood: finalState.mood as "SUN" | "CLOUD" | "RAIN" | "STORM" | "FOG" | "ANGER",
        weekHighlight: finalState.highlightText ?? null,
        weekSummary: finalState.summaryText ?? null,
        contextAudience: "TEAM",
        blockerAudience: "TEAM",
      },
    })
    await prisma.user.update({ where: { id: user.id }, data: { slackConvState: null } })

    const BILAN_LABELS: Record<string, string> = {
      SUN: "☀️ Super semaine", CLOUD: "⛅ Correcte", RAIN: "🌧️ Difficile",
      STORM: "⛈️ Mal dormi", FOG: "🌫️ Stressé·e", ANGER: "😤 Mauvaise humeur",
    }
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const lines = [`📋 *Bilan de ${user.name}* — ${BILAN_LABELS[finalState.mood]}`]
      if (finalState.highlightText) lines.push(`> ✨ ${finalState.highlightText}`)
      if (finalState.summaryText)   lines.push(`> 💡 ${finalState.summaryText}`)
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines.join("\n") }),
      }).catch(() => {})
    }

    await sendDM(channel, `✅ Bilan enregistré ! Bonne fin de semaine ${user.name} 🌿\n📹 N'oublie pas ton clip vidéo — dans le champ de message, clique sur *···* (plus d'options, juste en dessous) → *caméra* 🎥 → il s'enverra directement dans <#C02GDFCA6G7> !`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
