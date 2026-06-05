"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, joinCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur de connexion")
        return
      }
      router.push("/meteo")
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-primary opacity-30 animate-ping absolute" />
            <div className="w-16 h-16 rounded-full border-4 border-primary" />
            <div className="w-4 h-4 rounded-full bg-primary absolute" />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Pulse Collectif</h1>
          <p className="text-sm text-gray-500 text-center">Comment va l'équipe, vraiment ?</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ton prénom
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Léa, Marc…"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Code d'équipe
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="PULSE1"
              maxLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-300"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !joinCode.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? "Connexion…" : "Rejoindre l'équipe"}
          </button>
        </form>
      </div>
    </main>
  )
}
