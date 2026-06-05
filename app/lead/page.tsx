import { requireLead } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import BottomNav from "@/components/BottomNav"
import { MoodDot, MoodBadge, type MoodKey } from "@/components/MoodIcon"
import LeadMeteoRow from "./LeadMeteoRow"

export const dynamic = "force-dynamic"

export default async function LeadPage() {
  const session = await requireLead()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const fiveDaysAgo = new Date(todayStart)
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 4)

  // Tous les membres de l'équipe
  const members = await prisma.user.findMany({
    where: { teamId: session.teamId },
    orderBy: { name: "asc" },
  })

  // Météos des 5 derniers jours
  const recentMeteos = await prisma.meteo.findMany({
    where: { teamId: session.teamId, createdAt: { gte: fiveDaysAgo } },
    orderBy: { createdAt: "asc" },
  })

  // Météo du jour pour chaque membre
  const todayMeteos = recentMeteos.filter((m) => m.createdAt >= todayStart)

  // Construire la tendance par membre (5 jours)
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(fiveDaysAgo)
    d.setDate(d.getDate() + i)
    return d
  })

  const memberData = members.map((member) => {
    const trend = days.map((day) => {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      return recentMeteos.find(
        (m) => m.userId === member.id && m.createdAt >= dayStart && m.createdAt < dayEnd
      ) ?? null
    })

    const todayMeteo = todayMeteos.find((m) => m.userId === member.id) ?? null

    // Signal : 3 RAIN/STORM consécutifs
    const moods = trend.filter(Boolean).map((m) => m!.mood)
    const lastThree = moods.slice(-3)
    const alertMood = lastThree.length === 3 && lastThree.every((m) => m === "RAIN" || m === "STORM")

    // Signal : aucune météo depuis 3j+
    const lastMeteoDate = trend.reduceRight<Date | null>((acc, m) => {
      if (acc !== null) return acc
      return m ? m.createdAt : null
    }, null)
    const daysSinceLastMeteo = lastMeteoDate
      ? Math.floor((now.getTime() - lastMeteoDate.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const alertSilence = daysSinceLastMeteo !== null && daysSinceLastMeteo >= 3

    return { member, trend, todayMeteo, alertMood, alertSilence }
  })

  const alerts = memberData.filter((d) => d.alertMood || d.alertSilence)

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Lead</p>
          <h1 className="text-2xl font-bold text-gray-900">Vue d'ensemble</h1>
        </header>

        {/* Signaux */}
        {alerts.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Signaux</h2>
            <div className="space-y-2">
              {alerts.map(({ member, alertMood, alertSilence }) => (
                <div key={member.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                  <span className="text-warning text-lg">⚠️</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {alertMood && "3 météos difficiles consécutives"}
                      {alertMood && alertSilence && " · "}
                      {alertSilence && "Absent·e depuis 3+ jours"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Suggestions */}
        <section className="mb-6">
          <a
            href="/suggestions"
            className="flex items-center justify-between bg-primary-light rounded-2xl px-4 py-3.5 text-primary font-medium text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span>Suggestions d'actions</span>
            </div>
            <span className="opacity-60">→</span>
          </a>
        </section>

        {/* Météos membres */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Membres · {todayMeteos.length}/{members.length} aujourd'hui
          </h2>
          <div className="space-y-2">
            {memberData.map((d) => (
              <LeadMeteoRow key={d.member.id} data={d} />
            ))}
          </div>
        </section>
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
