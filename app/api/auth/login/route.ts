import { createSession, hashPassword, verifyPassword } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { ApiError, parseBody, route } from "@/lib/server/http"
import { rateLimit } from "@/lib/server/rate-limit"
import { loginSchema } from "@/lib/server/schemas"

// Verified against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = hashPassword("not-a-real-password")

export const POST = route(async (req) => {
  const { email, password } = await parseBody(req, loginSchema)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  if (!rateLimit(`login:${ip}:${email}`, 10, 15 * 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again in a few minutes.")
  }
  const user = await db.user.findUnique({ where: { email } })
  const ok = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH))
  if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
  await createSession(user.id)
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role, providerId: user.providerId } }
})
