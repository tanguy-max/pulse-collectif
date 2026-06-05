"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const TAGS = [
  "soutien discret",
  "travail de fond",
  "fiabilité",
  "leadership",
  "écoute",
  "créativité",
  "courage",
  "humour",
]

type Member = { id: string; name: string; initials: string }
type Gratitude = {
  id: string
  fromUser: Member
  toUser: Member | null
  tags: string[]
  message: string | null
  createdAt: string
}

type Props = {
  members: Member[]
  initialGratitudes: Gratitude[]
  currentUserId: string
}

export default function GratitudesClient({ members, initialGratitudes, currentUserId }: Props) {
  const router = useRouter()
  const [gratitudes, setGratitudes] = useState(initialGratitudes)
  const [step, setStep] = useState<1 | 2 | 3 | null>(null)
  const [toUserId, setToUserId] = useState<string | "team">("")
  const [tags, setTags] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  function startForm() {
    setStep(1)
    setToUserId("")
    setTags([])
    setMessage("")
  }

  function toggleTag(t: string) {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch("/api/gratitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: toUserId === "team" ? null : toUserId || null,
          tags,
          message,
        }),
      })
      if (res.ok) {
        const { gratitude } = await res.json()
        setGratitudes((prev) => [{
          ...gratitude,
          tags: JSON.parse(gratitude.tags) as string[],
          createdAt: gratitude.createdAt,
        }, ...prev])
        setStep(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const recipientName =
    toUserId === "team"
      ? "Toute l'équipe"
      : members.find((m) => m.id === toUserId)?.name ?? ""

  return (
    <div className="space-y-4">
      {/* Bouton nouveau */}
      {step === null && (
        <button
          onClick={startForm}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-base active:scale-[0.98] transition-transform"
        >
          + Envoyer une gratitude
        </button>
      )}

      {/* Formulaire 3 étapes */}
      {step !== null && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          {/* Progress */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-gray-100"}`} />
            ))}
          </div>

          {/* Étape 1 — Destinataire */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Pour qui ?</h3>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                <RecipientBtn
                  label="Toute l'équipe"
                  initials="🫂"
                  selected={toUserId === "team"}
                  onClick={() => setToUserId("team")}
                  isEmoji
                />
                {members
                  .filter((m) => m.id !== currentUserId)
                  .map((m) => (
                    <RecipientBtn
                      key={m.id}
                      label={m.name}
                      initials={m.initials}
                      selected={toUserId === m.id}
                      onClick={() => setToUserId(m.id)}
                    />
                  ))}
              </div>
              <button
                onClick={() => toUserId && setStep(2)}
                disabled={!toUserId}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          )}

          {/* Étape 2 — Tags */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Pourquoi ?</h3>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      tags.includes(t)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-primary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => tags.length > 0 && setStep(3)}
                  disabled={tags.length === 0}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-40"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Étape 3 — Message + preview */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Un mot ? <span className="text-gray-400 font-normal">(optionnel)</span></h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Quelque chose à ajouter…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
              />

              {/* Prévisualisation */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Aperçu</p>
                <p className="text-sm font-medium text-gray-800">→ {recipientName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium">{t}</span>
                  ))}
                </div>
                {message && <p className="text-sm text-gray-600 italic">"{message}"</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
                >
                  ← Retour
                </button>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-success text-white font-semibold disabled:opacity-40"
                >
                  {loading ? "Envoi…" : "Envoyer 💜"}
                </button>
              </div>
            </div>
          )}

          {/* Annuler */}
          <button onClick={() => setStep(null)} className="w-full text-xs text-gray-300 hover:text-gray-400">
            Annuler
          </button>
        </div>
      )}

      {/* Fil des gratitudes */}
      {gratitudes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
          <span className="text-4xl">💜</span>
          <p className="text-sm">Aucune gratitude cette semaine encore.</p>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {gratitudes.map((g) => (
            <article key={g.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {g.fromUser.initials}
                </div>
                <span className="text-sm font-medium text-gray-900">{g.fromUser.name}</span>
                <span className="text-gray-300 text-sm">→</span>
                <span className="text-sm font-medium text-gray-900">
                  {g.toUser ? g.toUser.name : "Toute l'équipe"}
                </span>
                <span className="ml-auto text-xs text-gray-300">
                  {new Date(g.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.tags.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium">{t}</span>
                ))}
              </div>
              {g.message && <p className="text-sm text-gray-600 italic">"{g.message}"</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function RecipientBtn({
  label, initials, selected, onClick, isEmoji = false,
}: {
  label: string; initials: string; selected: boolean; onClick: () => void; isEmoji?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
        selected ? "border-primary bg-primary-light" : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        isEmoji ? "text-xl" : "bg-primary-light text-primary"
      }`}>
        {initials}
      </div>
      <span className={`font-medium text-sm ${selected ? "text-primary" : "text-gray-800"}`}>{label}</span>
      {selected && <span className="ml-auto text-primary">✓</span>}
    </button>
  )
}
