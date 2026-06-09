"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const MOODS = [
  { value: "SUN",   emoji: "☀️",  label: "Au top",          desc: "Énergie et clarté" },
  { value: "CLOUD", emoji: "⛅",  label: "Correct",          desc: "Ça roule" },
  { value: "RAIN",  emoji: "🌧️", label: "Difficile",        desc: "C'est un peu dur" },
  { value: "STORM", emoji: "⛈️", label: "Mal dormi·e",       desc: "Nuit difficile" },
  { value: "FOG",   emoji: "🌫️", label: "Stressé·e",        desc: "Sous pression" },
  { value: "ANGER", emoji: "😤",  label: "Mauvaise humeur",  desc: "Ça ne va pas" },
]

const AUDIENCES = [
  { value: "TEAM",    label: "Équipe",  desc: "Visible dans le fil" },
  { value: "LEAD",    label: "Lead",    desc: "Uniquement visible par le lead" },
  { value: "PRIVATE", label: "Privé",   desc: "Stocké, jamais affiché" },
]

export default function MeteoForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [mood, setMood] = useState("")
  const [contextText, setContextText] = useState("")
  const [contextAudience, setContextAudience] = useState("TEAM")
  const [blockerText, setBlockerText] = useState("")
  const [blockerAudience, setBlockerAudience] = useState("TEAM")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mood) { setError("Choisis une météo"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/meteo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, contextText, contextAudience, blockerText, blockerAudience }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const d = await res.json()
        setError(d.error ?? "Erreur")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Mood selector */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ton humeur</h2>
        <div className="grid grid-cols-1 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                mood === m.value
                  ? "border-primary bg-primary-light"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <span className="text-2xl w-8 text-center">{m.emoji}</span>
              <div>
                <p className={`font-semibold ${mood === m.value ? "text-primary" : "text-gray-800"}`}>{m.label}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
              {mood === m.value && (
                <span className="ml-auto text-primary font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Contexte */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Contexte <span className="text-gray-300 font-normal">(optionnel)</span>
        </h2>
        <textarea
          value={contextText}
          onChange={(e) => setContextText(e.target.value.slice(0, 280))}
          placeholder="Qu'est-ce qui influence ton humeur ?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
        />
        <div className="flex justify-between items-center mt-1.5">
          <AudienceSelect value={contextAudience} onChange={setContextAudience} disabled={!contextText.trim()} />
          <span className="text-xs text-gray-300">{contextText.length}/280</span>
        </div>
      </section>

      {/* Bloqueur */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Bloqueur <span className="text-gray-300 font-normal">(optionnel)</span>
        </h2>
        <textarea
          value={blockerText}
          onChange={(e) => setBlockerText(e.target.value.slice(0, 280))}
          placeholder="Un obstacle, un frein, quelque chose qui coince ?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
        />
        <div className="flex justify-between items-center mt-1.5">
          <AudienceSelect value={blockerAudience} onChange={setBlockerAudience} disabled={!blockerText.trim()} />
          <span className="text-xs text-gray-300">{blockerText.length}/280</span>
        </div>
      </section>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading || !mood}
        className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        {loading ? "Envoi…" : `Envoyer ma météo`}
      </button>

      <p className="text-center text-xs text-gray-300 pb-2">Bonjour {userName} 👋</p>
    </form>
  )
}

function AudienceSelect({ value, onChange, disabled }: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  if (disabled) {
    return <span className="text-xs text-gray-300 italic">Remplis le champ pour choisir le partage</span>
  }
  return (
    <div className="flex gap-1">
      {AUDIENCES.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => onChange(a.value)}
          title={a.desc}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
            value === a.value
              ? "bg-primary text-white font-medium"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
