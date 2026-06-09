const MOODS = {
  SUN:   { label: "Au top",          emoji: "☀️",  bg: "bg-amber-50",  text: "text-amber-500",  border: "border-amber-300" },
  CLOUD: { label: "Correct",         emoji: "⛅",  bg: "bg-sky-50",    text: "text-sky-500",    border: "border-sky-300" },
  RAIN:  { label: "Difficile",       emoji: "🌧️", bg: "bg-blue-50",   text: "text-blue-500",   border: "border-blue-300" },
  STORM: { label: "Mal dormi",      emoji: "⛈️", bg: "bg-purple-50", text: "text-purple-500", border: "border-purple-300" },
  FOG:   { label: "Stressé·e",       emoji: "🌫️", bg: "bg-gray-50",   text: "text-gray-400",   border: "border-gray-300" },
  ANGER: { label: "Mauvaise humeur", emoji: "😤",  bg: "bg-red-50",    text: "text-red-500",    border: "border-red-300" },
} as const

export type MoodKey = keyof typeof MOODS

export function getMood(key: MoodKey) {
  return MOODS[key]
}

export function MoodBadge({ mood }: { mood: MoodKey }) {
  const m = MOODS[mood]
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full ${m.bg} ${m.text}`}>
      {m.emoji} {m.label}
    </span>
  )
}

export function MoodDot({ mood }: { mood: MoodKey }) {
  const colors: Record<MoodKey, string> = {
    SUN:   "bg-amber-400",
    CLOUD: "bg-sky-400",
    RAIN:  "bg-blue-400",
    STORM: "bg-purple-400",
    FOG:   "bg-gray-300",
    ANGER: "bg-red-400",
  }
  return <span className={`inline-block w-3 h-3 rounded-full ${colors[mood]}`} title={MOODS[mood].label} />
}
