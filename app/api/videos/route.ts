import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { writeFile } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { sessionOptions, type SessionData } from "@/lib/session"

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const videos = await prisma.video.findMany({
    where: { teamId: session.teamId, createdAt: { gte: weekStart } },
    include: { user: { select: { name: true, initials: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ videos })
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const contentType = req.headers.get("content-type") ?? ""

  // Loom URL (JSON)
  if (contentType.includes("application/json")) {
    const { loomUrl, meteoId } = await req.json()
    if (!loomUrl) return NextResponse.json({ error: "URL manquante" }, { status: 400 })

    const video = await prisma.video.create({
      data: {
        userId: session.userId,
        teamId: session.teamId,
        meteoId: meteoId ?? null,
        fileName: loomUrl,
      },
      include: { user: { select: { name: true, initials: true } } },
    })

    return NextResponse.json({ ok: true, video })
  }

  // Fichier uploadé (FormData)
  const formData = await req.formData()
  const blob = formData.get("video") as Blob | null
  const duration = parseInt(formData.get("duration") as string ?? "0", 10)
  const meteoId = (formData.get("meteoId") as string) || null

  if (!blob) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })

  const ext = blob.type.includes("mp4") ? "mp4" : "webm"
  const fileName = `${session.userId}-${Date.now()}.${ext}`
  const filePath = path.join(process.cwd(), "public", "videos", fileName)

  const buffer = Buffer.from(await blob.arrayBuffer())
  await writeFile(filePath, buffer)

  const video = await prisma.video.create({
    data: {
      userId: session.userId,
      teamId: session.teamId,
      meteoId: meteoId ?? null,
      fileName,
      duration: isNaN(duration) ? null : duration,
    },
    include: { user: { select: { name: true, initials: true } } },
  })

  return NextResponse.json({ ok: true, video, url: `/videos/${fileName}` })
}
