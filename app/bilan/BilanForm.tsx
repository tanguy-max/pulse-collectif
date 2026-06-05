"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import VideoRecorder from "@/components/VideoRecorder"

type PendingVideo = { blob: Blob; duration: number }

const MOODS = [
  { value: "SUN",   emoji: "☀️",  label: "Au top" },
  { value: "CLOUD", emoji: "⛅",  label: "Correct" },
  { value: "RAIN",  emoji: "🌧️", label: "Difficile" },
  { value: "STORM", emoji: "⛈️", label: "Épuisé·e" },
  { value: "FOG",   emoji: "🌫️", label: "Flou" },
]

const AUDIENCES = [
  { value: "TEAM",    label: "Équipe" },
  { value: "LEAD",    label: "Lead" },
  { value: "PRIVATE", label: "Privé" },
]

export default function BilanForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [mood, setMood] = useState("")
  const [weekHighlight, setWeekHighlight] = useState("")
  const [highlightAudience, setHighlightAudience] = useState("TEAM")
  const [weekSummary, setWeekSummary] = useState("")
  const [summaryAudience, setSummaryAudience] = useState("TEAM")
  const [showRecorder, setShowRecorder] = useState(false)
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mood) { setError("Choisis une météo de fin de semaine"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/bilan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, weekHighlight, highlightAudience, weekSummary, summaryAudience }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erreur")
        return
      }
      const { meteoId } = await res.json()

      // Upload la vidéo en la liant au bilan
      if (pendingVideo) {
        const form = new FormData()
        form.append("video", pendingVideo.blob, "bilan.webm")
        form.append("duration", String(pendingVideo.duration))
        form.append("meteoId", meteoId)
        await fetch("/api/videos", { method: "POST", body: form })
      }

      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">Bilan envoyé !</p>
          <p className="text-sm text-gray-500 mt-1">Bonne fin de semaine {userName} 🌿</p>
        </div>
        <button
          onClick={() => router.push("/fil")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium text-sm"
        >
          Voir le fil →
        </button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Météo de fin de semaine */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Météo de la semaine</h2>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all text-sm ${
                  mood === m.value ? "border-primary bg-primary-light" : "border-gray-100 bg-white"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-xs font-medium ${mood === m.value ? "text-primary" : "text-gray-500"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Moment marquant */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Moment marquant <span className="text-gray-300 font-normal">(optionnel)</span>
          </h2>
          <textarea
            value={weekHighlight}
            onChange={(e) => setWeekHighlight(e.target.value.slice(0, 280))}
            placeholder="Un moment, une interaction, une réalisation…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-300"
          />
          {weekHighlight && (
            <div className="flex gap-1 mt-1.5">
              {AUDIENCES.map((a) => (
                <button key={a.value} type="button" onClick={() => setHighlightAudience(a.value)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    highlightAudience === a.value ? "bg-primary text-white font-medium" : "bg-gray-100 text-gray-500"
                  }`}
                >{a.label}</button>
              ))}
            </div>
          )}
        </section>

        {/* Ce que j'emporte */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Ce que j'emporte <span className="text-gray-300 font-normal">(optionnel)</span>
          </h2>
          <textarea
            value={weekSummary}
            onChange={(e) => setWeekSummary(e.target.value.slice(0, 280))}
            placeholder="Une leçon, une intention, quelque chose à garder…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-300"
          />
          {weekSummary && (
            <div className="flex gap-1 mt-1.5">
              {AUDIENCES.map((a) => (
                <button key={a.value} type="button" onClick={() => setSummaryAudience(a.value)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    summaryAudience === a.value ? "bg-primary text-white font-medium" : "bg-gray-100 text-gray-500"
                  }`}
                >{a.label}</button>
              ))}
            </div>
          )}
        </section>

        {/* Vidéo optionnelle */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Vidéo <span className="text-gray-300 font-normal">(optionnel)</span>
          </h2>
          {pendingVideo ? (
            <div className="flex items-center gap-3 bg-success/10 rounded-xl px-4 py-3">
              <span className="text-success text-lg">✓</span>
              <p className="text-sm font-medium text-success flex-1">Vidéo prête ({pendingVideo.duration}s)</p>
              <button
                type="button"
                onClick={() => setPendingVideo(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRecorder(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <span>📹</span>
              <span>Enregistrer une vidéo</span>
            </button>
          )}
        </section>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading || !mood}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {loading ? "Envoi…" : "Envoyer mon bilan"}
        </button>
      </form>

      {showRecorder && (
        <VideoRecorder
          onClose={() => setShowRecorder(false)}
          onRecorded={(blob, duration) => {
            setPendingVideo({ blob, duration })
            setShowRecorder(false)
          }}
        />
      )}
    </>
  )
}
