import { listSlots } from "@/lib/server/booking-service"
import { db } from "@/lib/server/db"
import { ApiError, notFound, parseQuery, route } from "@/lib/server/http"
import { rateLimit } from "@/lib/server/rate-limit"
import { publicSlotsQuerySchema } from "@/lib/server/schemas"

export const GET = route(async (req, ctx) => {
  const { slug } = await ctx.params
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  if (!rateLimit(`slots:${ip}`, 120, 60_000)) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.")
  const q = parseQuery(req, publicSlotsQuerySchema)
  const business = await db.business.findUnique({ where: { slug } })
  if (!business) throw notFound("Business")
  const slots = await listSlots({ businessId: business.id, timeZone: business.timeZone }, q)
  return { timeZone: business.timeZone, slots }
})
