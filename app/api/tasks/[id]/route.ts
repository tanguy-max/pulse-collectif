import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params
  const { done } = await req.json()

  await prisma.task.update({
    where: { id, userId: session.userId },
    data: { done },
  })

  return NextResponse.json({ ok: true })
}
