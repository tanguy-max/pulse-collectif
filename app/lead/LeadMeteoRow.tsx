"use client"

import { useState } from "react"
import { MoodDot, MoodBadge, type MoodKey } from "@/components/MoodIcon"

type MeteoData = {
  id: string
  mood: string
  contextText: string | null
  contextAudience: string
  blockerText: string | null
  blockerAudience: string
  createdAt: Date
}

type Props = {
  data: {
    member: { id: string; name: string; initials: string }
    trend: (MeteoData | null)[]
    todayMeteo: MeteoData | null
    alertMood: boolean
    alertSilence: boolean
  }
}

export default function LeadMeteoRow({ data }: Props) {
  const { member, trend, todayMeteo } = data
  const [open, setOpen] = useState(false)

  // Champs visibles par le lead (LEAD audience) — jamais PRIVATE
  const visibleContext =
    todayMeteo?.contextText && todayMeteo.contextAudience !== "PRIVATE"
      ? todayMeteo
      : null
  const visibleBlocker =
    todayMeteo?.blockerText && todayMeteo.blockerAudience !== "PRIVATE"
      ? todayMeteo
      : null
  const hasPrivateContext = todayMeteo?.contextText && todayMeteo.contextAudience === "PRIVATE"
  const hasPrivateBlocker = todayMeteo?.blockerText && todayMeteo.blockerAudience === "PRIVATE"
  const hasPrivate = hasPrivateContext || hasPrivateBlocker

  const hasDetails = visibleContext || visibleBlocker || hasPrivate

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {member.initials}
        </div>

        {/* Name + trend */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
          <div className="flex gap-1 mt-1">
            {trend.map((m, i) => (
              <span key={i}>
                {m ? <MoodDot mood={m.mood as MoodKey} /> : <span className="inline-block w-3 h-3 rounded-full bg-gray-100" />}
              </span>
            ))}
          </div>
        </div>

        {/* Today's mood */}
        {todayMeteo ? (
          <MoodBadge mood={todayMeteo.mood as MoodKey} />
        ) : (
          <span className="text-xs text-gray-300 italic">—</span>
        )}

        {/* Expand icon */}
        {hasDetails && (
          <span className={`text-gray-300 text-xs ml-1 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        )}
      </button>

      {/* Expanded details */}
      {open && hasDetails && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
          {visibleContext?.contextText && (
            <div className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-xs font-medium text-gray-400 uppercase block mb-1">
                Contexte {visibleContext.contextAudience === "LEAD" ? "· lead" : ""}
              </span>
              {visibleContext.contextText}
            </div>
          )}
          {visibleBlocker?.blockerText && (
            <div className="text-sm text-gray-700 bg-amber-50 rounded-xl px-3 py-2.5">
              <span className="text-xs font-medium text-warning uppercase block mb-1">
                Bloqueur {visibleBlocker.blockerAudience === "LEAD" ? "· lead" : ""}
              </span>
              {visibleBlocker.blockerText}
            </div>
          )}
          {hasPrivate && (
            <p className="text-xs text-gray-400 italic px-1">
              Contexte privé partagé (non visible)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
