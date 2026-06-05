import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import BottomNav from "@/components/BottomNav"
import { MoodBadge, type MoodKey } from "@/components/MoodIcon"

export const dynamic = "force-dynamic"

export default async function BilansPage() {
  const session = await requireAuth()
  const isLead = session.role === "LEAD"

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Bilans = meteos avec weekHighlight ou weekSummary renseigné
  const bilans = await prisma.meteo.findMany({
    where: {
      teamId: session.teamId,
      createdAt: { gte: weekStart },
      OR: [{ weekHighlight: { not: null } }, { weekSummary: { not: null } }],
    },
    include: {
      user: true,
      videos: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Cette semaine</p>
          <h1 className="text-2xl font-bold text-gray-900">Bilans</h1>
        </header>

        {bilans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
            <span className="text-4xl">📋</span>
            <p className="text-sm">Aucun bilan cette semaine encore.</p>
            <a href="/bilan" className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
              Faire mon bilan →
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bilans.map((b) => {
              const showMomentMarquant = b.blockerText && (
                b.blockerAudience === "TEAM" ||
                (isLead && b.blockerAudience === "LEAD")
              )
              const showCeQueJEmporte = b.contextText && (
                b.contextAudience === "TEAM" ||
                (isLead && b.contextAudience === "LEAD")
              )
              const video = b.videos[0] ?? null

              return (
                <article key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {b.user.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{b.user.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(b.createdAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <MoodBadge mood={b.mood as MoodKey} />
                  </div>

                  {/* Vidéo */}
                  {video && (
                    <div className="px-4 pb-3">
                      <video
                        src={`/videos/${video.fileName}`}
                        controls
                        playsInline
                        className="w-full rounded-xl bg-black aspect-video"
                      />
                    </div>
                  )}

                  {/* Contenu */}
                  {(showMomentMarquant || showCeQueJEmporte) && (
                    <div className="px-4 pb-4 space-y-2.5 border-t border-gray-50 pt-3">
                      {showMomentMarquant && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Moment marquant {b.blockerAudience === "LEAD" && <span className="text-primary">· lead</span>}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{b.blockerText}</p>
                        </div>
                      )}
                      {showCeQueJEmporte && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Ce que j'emporte {b.contextAudience === "LEAD" && <span className="text-primary">· lead</span>}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{b.contextText}</p>
                        </div>
                      )}
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
