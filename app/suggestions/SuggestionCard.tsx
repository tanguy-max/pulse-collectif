"use client"

import { useState } from "react"

type Action = {
  key: string
  intensity: "doux" | "modere" | "fort"
  emoji: string
  label: string
  wording: string
}

const ACTIONS: Action[] = [
  {
    key: "message",
    intensity: "doux",
    emoji: "💬",
    label: "Message bienveillant",
    wording: "Hey [prénom], je pensais à toi aujourd'hui — comment tu vas vraiment ?",
  },
  {
    key: "one_on_one",
    intensity: "modere",
    emoji: "🤝",
    label: "1:1 express",
    wording:
      "Hey [prénom], je te propose un point de 15 min cette semaine, juste pour débriefer tranquillement. Tu as un créneau ?",
  },
  {
    key: "dedicated_point",
    intensity: "fort",
    emoji: "🔴",
    label: "Point dédié",
    wording:
      "Hey [prénom], j'aimerais qu'on prenne un temps dédié pour se parler sans se presser. C'est important pour moi qu'on soit bien aligné·es.",
  },
]

const INTENSITY_STYLE: Record<string, string> = {
  doux: "bg-green-50 border-green-100 text-green-700",
  modere: "bg-amber-50 border-amber-100 text-amber-700",
  fort: "bg-red-50 border-red-100 text-red-700",
}

type Props = {
  memberId: string
  memberName: string
  memberInitials: string
  doneKeys: string[]
}

export default function SuggestionCard({ memberId, memberName, memberInitials, doneKeys }: Props) {
  const [done, setDone] = useState<Set<string>>(new Set(doneKeys))
  const [copied, setCopied] = useState<string | null>(null)

  async function toggle(actionKey: string) {
    const isDone = done.has(actionKey)
    const next = new Set(done)
    isDone ? next.delete(actionKey) : next.add(actionKey)
    setDone(next)

    await fetch("/api/suggestions/done", {
      method: isDone ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, actionKey }),
    })
  }

  function copy(action: Action) {
    const text = action.wording.replace("[prénom]", memberName)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(action.key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold flex-shrink-0">
          {memberInitials}
        </div>
        <p className="font-semibold text-gray-900">{memberName}</p>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {ACTIONS.map((action) => {
          const isDone = done.has(action.key)
          const wasCopied = copied === action.key
          return (
            <div
              key={action.key}
              className={`rounded-xl border p-3 transition-opacity ${INTENSITY_STYLE[action.intensity]} ${isDone ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span>{action.emoji}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">{action.label}</span>
                </div>
                <button
                  onClick={() => toggle(action.key)}
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                    isDone
                      ? "bg-success text-white"
                      : "bg-white border border-current text-current"
                  }`}
                >
                  {isDone ? "Fait ✓" : "Marquer fait"}
                </button>
              </div>
              <p className="text-sm leading-relaxed italic">
                &ldquo;{action.wording.replace("[prénom]", memberName)}&rdquo;
              </p>
              <button
                onClick={() => copy(action)}
                className="mt-2 text-xs underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                {wasCopied ? "Copié ✓" : "Copier ce message"}
              </button>
            </div>
          )
        })}
      </div>
    </article>
  )
}
