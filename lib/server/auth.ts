import { createHash, randomBytes } from "node:crypto"
import type { Role } from "@prisma/client"
import { cookies } from "next/headers"
export { hashPassword, verifyPassword } from "./auth-hash"
import { db } from "./db"
import { forbidden, unauthorized } from "./http"

export const SESSION_COOKIE = "appointiq_session"
const SESSION_DAYS = 7

export interface AuthContext {
  userId: string
  name: string
  email: string
  role: Role
  businessId: string
  /** Set for PROVIDER users: the only provider record they may act on. */
  providerId: string | null
  businessTimeZone: string
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  jar.delete(SESSION_COOKIE)
}

export async function getAuth(): Promise<AuthContext | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { business: { select: { timeZone: true } } } } },
  })
  if (!session || session.expiresAt < new Date()) return null
  const u = session.user
  return {
    userId: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    businessId: u.businessId,
    providerId: u.providerId,
    businessTimeZone: u.business.timeZone,
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth()
  if (!auth) throw unauthorized()
  return auth
}

export async function requireAdmin(): Promise<AuthContext> {
  const auth = await requireAuth()
  if (auth.role !== "ADMIN") throw forbidden("Only business admins can do that.")
  return auth
}

/** Provider users may only touch their own provider id. Admins may touch any in their business. */
export function assertProviderAccess(auth: AuthContext, providerId: string) {
  if (auth.role === "PROVIDER" && auth.providerId !== providerId) throw forbidden()
}
