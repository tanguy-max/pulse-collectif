import { requireLead } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import BottomNav from "@/components/BottomNav"
import { MoodDot, type MoodKey } from "@/components/MoodIcon"
import SuggestionCard from "./SuggestionCard"

export const dynamic = "force-dynamic"

export default async function SuggestionsPage() {
  const session = await requireLead()

  const now = new Date()
  const fiveDaysAgo = new Date(now)
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 4)
  fiveDaysAgo.setHours(0, 0, 0, 0)

  const members = await prisma.user.findMany({
    where: { teamId: session.teamId, role: "MEMBER" },
    orderBy: { name: "asc" },
  })

  const recentMeteos = await prisma.meteo.findMany({
    where: { teamId: session.teamId, createdAt: { gte: fiveDaysAgo } },
    orderBy: { createdAt: "asc" },
  })

  const doneActions = await (prisma.leadAction as typeof prisma.leadAction | undefined)?.findMany({
    where: { leadId: session.userId, teamId: session.teamId },
  }) ?? []

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
    const doneKeys = doneActions
      .filter((a) => a.memberId === member.id)
      .map((a) => a.actionKey)
    return { member, trend, doneKeys }
  })

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-6">
          <a href="/lead" className="text-xs text-gray-400 mb-2 inline-block">← Vue d'ensemble</a>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Lead</p>
          <h1 className="text-2xl font-bold text-gray-900">Suggestions d'actions</h1>
          <p className="text-sm text-gray-400 mt-1">Basé sur les météos des 5 derniers jours</p>
        </header>

        <div className="space-y-5">
          {memberData.map(({ member, trend, doneKeys }) => (
            <div key={member.id} className="space-y-2">
              {/* Tendance météo */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-gray-400 w-16 shrink-0">Tendance</span>
                <div className="flex gap-1.5">
                  {trend.map((m, i) =>
                    m ? (
                      <MoodDot key={i} mood={m.mood as MoodKey} />
                    ) : (
                      <span key={i} className="w-4 h-4 rounded-full bg-gray-100 inline-block" />
                    )
                  )}
                </div>
              </div>

              <SuggestionCard
                memberId={member.id}
                memberName={member.name}
                memberInitials={member.initials}
                doneKeys={doneKeys}
              />
            </div>
          ))}
        </div>
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
