import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import MeteoForm from "./MeteoForm"
import BottomNav from "@/components/BottomNav"
import TaskSection from "@/components/TaskSection"
import Link from "next/link"

export default async function MeteoPage() {
  const session = await requireAuth()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const existing = await prisma.meteo.findFirst({
    where: { userId: session.userId, createdAt: { gte: start, lte: end } },
  })

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-8">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Comment tu vas ?</h1>
        </header>

        {existing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center text-2xl">✓</div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">Météo envoyée</p>
                <p className="text-sm text-gray-500 mt-1">Merci {session.userName} !</p>
              </div>
              <Link
                href="/fil"
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium text-sm"
              >
                Voir le fil d'équipe →
              </Link>
            </div>
            <TaskSection userId={session.userId} />
          </div>
        ) : (
          <MeteoForm userName={session.userName} />
        )}
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
