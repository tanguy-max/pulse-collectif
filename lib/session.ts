import { SessionOptions } from "iron-session"

export interface SessionData {
  userId: string
  userName: string
  teamId: string
  role: "MEMBER" | "LEAD"
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "pulse_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
}
