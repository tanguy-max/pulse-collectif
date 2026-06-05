import { requireAuth } from "@/lib/auth"
import BottomNav from "@/components/BottomNav"
import BilanForm from "./BilanForm"

export default async function BilanPage() {
  const session = await requireAuth()

  return (
    <>
      <main className="min-h-dvh pb-24 px-4 pt-8 max-w-md mx-auto">
        <header className="mb-8">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium mb-1">Bilan de la semaine</p>
          <h1 className="text-2xl font-bold text-gray-900">C'était comment ?</h1>
        </header>
        <BilanForm userName={session.userName} />
      </main>
      <BottomNav role={session.role} />
    </>
  )
}
