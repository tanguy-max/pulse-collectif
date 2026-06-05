import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import BottomNav from "@/components/BottomNav"
import GratitudesClient from "./GratitudesClient"

export const dynamic = "force-dynamic"

export default async function GratitudesPage() {
  const session = await requireAuth()

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [members, gratitudes] = await Promise.all([
    prisma.user.findMany({
      where: { teamId: session.teamId },
      orderBy: { name: "asc" },
    }),
    prisma.gratitude.findMany({
      where: { teamId: session.teamId, createdAt: { gte: weekStart } },
      include: { fromUser: true, toUser: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const serialized = gratitudes.map((g) => ({
    ...g,
    tags: JSON.parse(g.tags) as string[],
    createdAt: g.createdAt.toISOString(),
    fromUser: { ...g.fromUser, createdAt: g.fromUser.createdAt.toISOString() },
    toUser: g.toUser ? { ...g.toUser, createdAt: g.toUser.createdAt.toISOString() } : null,
  }))

  const serializedMembers = members.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Cette semaine</p>
          <h1 className="text-2xl font-bold text-gray-900">Gratitudes</h1>
        </header>
        <GratitudesClient
          members={serializedMembers}
          initialGratitudes={serialized}
          currentUserId={session.userId}
        />
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
