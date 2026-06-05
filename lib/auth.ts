import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sessionOptions, type SessionData } from "./session"

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session.userId) redirect("/")
  return session
}

export async function requireLead() {
  const session = await requireAuth()
  if (session.role !== "LEAD") redirect("/fil")
  return session
}

export function generateInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}
