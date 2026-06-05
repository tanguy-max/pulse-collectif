import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sessionOptions, type SessionData } from "@/lib/session"
import { generateInitials } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { name, joinCode } = await req.json()

  if (!name?.trim() || !joinCode?.trim()) {
    return NextResponse.json({ error: "Prénom et code requis" }, { status: 400 })
  }

  const team = await prisma.team.findUnique({ where: { joinCode: joinCode.trim().toUpperCase() } })
  if (!team) {
    return NextResponse.json({ error: "Code d'équipe invalide" }, { status: 404 })
  }

  // Recherche insensible à la casse via SQL brut (SQLite ne supporte pas mode: 'insensitive')
  const trimmedName = name.trim()
  const found = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE "teamId" = ${team.id} AND LOWER("name") = LOWER(${trimmedName}) LIMIT 1
  `
  let user = found.length > 0
    ? await prisma.user.findUnique({ where: { id: found[0].id } })
    : null

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name.trim(),
        initials: generateInitials(name.trim()),
        teamId: team.id,
        role: "MEMBER",
      },
    })
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.userId = user.id
  session.userName = user.name
  session.teamId = team.id
  session.role = user.role as "MEMBER" | "LEAD"
  await session.save()

  return NextResponse.json({ ok: true, role: user.role })
}
