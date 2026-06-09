"use client"

import { useState } from "react"
import Link from "next/link"
import { MoodDot, type MoodKey } from "./MoodIcon"

type DayMeteo = { mood: MoodKey } | null
type MemberRow = { name: string; initials: string; days: DayMeteo[] }

type Props = {
  members: MemberRow[]
  dayLabels: string[]
}

export default function WeeklyMoodSummary({ members, dayLabels }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <span className="font-semibold text-gray-800 text-sm">Météos de la semaine</span>
        </div>
        <span className={`text-gray-300 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-4">
          {/* Légende jours */}
          <div className="flex items-center">
            <div className="w-20 flex-shrink-0" />
            {dayLabels.map((d, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-400 font-medium">{d}</div>
            ))}
          </div>

          {/* Grille membres × jours */}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.name} className="flex items-center">
                <div className="w-20 flex-shrink-0 flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {m.initials}
                  </div>
                  <span className="text-xs text-gray-700 truncate">{m.name}</span>
                </div>
                {m.days.map((day, i) => (
                  <div key={i} className="flex-1 flex justify-center">
                    {day
                      ? <MoodDot mood={day.mood} />
                      : <span className="inline-block w-3 h-3 rounded-full bg-gray-100" />
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Légende couleurs */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {(["SUN","CLOUD","RAIN","STORM","FOG","ANGER"] as MoodKey[]).map((m) => (
              <span key={m} className="flex items-center gap-1 text-xs text-gray-400">
                <MoodDot mood={m} />
                {{ SUN: "Au top", CLOUD: "Correct", RAIN: "Difficile", STORM: "Mal dormi", FOG: "Stressé·e", ANGER: "Mauvaise humeur" }[m]}
              </span>
            ))}
          </div>

          {/* CTA bilan */}
          <Link
            href="/bilan"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold"
          >
            <span>✨ Faire mon bilan de semaine</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  )
}
