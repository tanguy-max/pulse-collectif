import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import BottomNav from "@/components/BottomNav"
import { MoodBadge, type MoodKey } from "@/components/MoodIcon"
import WeeklyMoodSummary from "@/components/WeeklyMoodSummary"

export const dynamic = "force-dynamic"

export default async function FilPage() {
  const session = await requireAuth()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Début de semaine (lundi)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=lundi … 6=dimanche
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - dayOfWeek)

  // Météos du jour + tâches
  const [todayMeteos, todayTasks] = await Promise.all([
    prisma.meteo.findMany({
      where: { teamId: session.teamId, createdAt: { gte: todayStart } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { teamId: session.teamId, date: { gte: todayStart } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Météos de la semaine + membres pour le récap
  const [weekMeteos, members] = await Promise.all([
    prisma.meteo.findMany({
      where: { teamId: session.teamId, createdAt: { gte: weekStart } },
      select: { userId: true, mood: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { teamId: session.teamId },
      orderBy: { name: "asc" },
    }),
  ])

  // Jours de la semaine jusqu'à aujourd'hui (lun → aujourd'hui)
  const days = Array.from({ length: dayOfWeek + 1 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const dayLabels = days.map((d) =>
    d.toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(".", "")
      .slice(0, 2)
      .toUpperCase()
  )

  const memberRows = members.map((member) => ({
    name: member.name,
    initials: member.initials,
    days: days.map((day) => {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const m = weekMeteos.find(
        (wm) => wm.userId === member.id && wm.createdAt >= dayStart && wm.createdAt < dayEnd
      )
      return m ? { mood: m.mood as MoodKey } : null
    }),
  }))

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Aujourd'hui</p>
          <h1 className="text-2xl font-bold text-gray-900">Fil d'équipe</h1>
        </header>

        {/* Récap semaine */}
        <div className="mb-5">
          <WeeklyMoodSummary
            members={memberRows}
            dayLabels={dayLabels}
          />
        </div>

        {/* Météos du jour */}
        {todayMeteos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
            <span className="text-4xl">🌅</span>
            <p className="text-sm">Personne n'a encore partagé sa météo aujourd'hui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayMeteos.map((m) => {
              const showContext = m.contextText && m.contextAudience === "TEAM"
              const showBlocker = m.blockerText && m.blockerAudience === "TEAM"
              const hasLeadOnly =
                (m.contextText && m.contextAudience === "LEAD") ||
                (m.blockerText && m.blockerAudience === "LEAD")

              const userTasks = todayTasks.filter(t => t.userId === m.userId)

              return (
                <article key={m.id} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {m.user.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{m.user.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <MoodBadge mood={m.mood as MoodKey} />
                  </div>

                  {showContext && (
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 py-2.5">
                      {m.contextText}
                    </p>
                  )}

                  {showBlocker && (
                    <div className="flex items-start gap-2 text-sm bg-amber-50 rounded-xl px-3 py-2.5">
                      <span className="mt-0.5">🚧</span>
                      <p className="text-gray-700 leading-relaxed">{m.blockerText}</p>
                    </div>
                  )}

                  {hasLeadOnly && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                        lead seul
                      </span>
                    </div>
                  )}

                  {userTasks.length > 0 && (
                    <div className="border-t border-gray-50 pt-3 space-y-1.5">
                      {userTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            task.done ? "bg-success border-success" : "border-gray-300"
                          }`}>
                            {task.done && <span className="text-white text-[8px] font-bold">✓</span>}
                          </div>
                          <span className={`text-sm ${task.done ? "line-through text-gray-300" : "text-gray-600"}`}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
