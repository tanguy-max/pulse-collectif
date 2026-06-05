import { NextRequest, NextResponse } from "next/server"
import { requireLead } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await requireLead()
  const { memberId, actionKey } = await req.json()
  if (!memberId || !actionKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  await prisma.leadAction.upsert({
    where: { leadId_memberId_actionKey: { leadId: session.userId, memberId, actionKey } },
    update: {},
    create: { leadId: session.userId, memberId, teamId: session.teamId, actionKey },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await requireLead()
  const { memberId, actionKey } = await req.json()
  if (!memberId || !actionKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  await prisma.leadAction.deleteMany({
    where: { leadId: session.userId, memberId, actionKey },
  })

  return NextResponse.json({ ok: true })
}
