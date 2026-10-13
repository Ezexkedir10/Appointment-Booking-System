import { assertProviderAccess, requireAuth } from "@/lib/server/auth"
import { listSlots } from "@/lib/server/booking-service"
import { parseQuery, route } from "@/lib/server/http"
import { slotsQuerySchema } from "@/lib/server/schemas"

export const GET = route(async (req) => {
  const auth = await requireAuth()
  const q = parseQuery(req, slotsQuerySchema)
  assertProviderAccess(auth, q.providerId)
  const slots = await listSlots({ businessId: auth.businessId, timeZone: auth.businessTimeZone }, q)
  return { timeZone: auth.businessTimeZone, slots }
})
