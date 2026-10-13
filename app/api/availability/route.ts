import { assertProviderAccess, requireAuth } from "@/lib/server/auth"
import { assertNoWindowOverlap } from "@/lib/server/availability-service"
import { db } from "@/lib/server/db"
import { badRequest, parseBody, route } from "@/lib/server/http"
import { availabilityCreateSchema } from "@/lib/server/schemas"
import { serializeAvailability } from "@/lib/server/serializers"

export const GET = route(async (req) => {
  const auth = await requireAuth()
  const providerId = req.nextUrl.searchParams.get("providerId") ?? undefined
  if (providerId) assertProviderAccess(auth, providerId)
  const rows = await db.availability.findMany({
    where: {
      businessId: auth.businessId,
      ...(auth.role === "PROVIDER" ? { providerId: auth.providerId ?? "none" } : providerId ? { providerId } : {}),
    },
    orderBy: [{ providerId: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  })
  return { availability: rows.map(serializeAvailability) }
})

export const POST = route(async (req) => {
  const auth = await requireAuth()
  const data = await parseBody(req, availabilityCreateSchema)
  assertProviderAccess(auth, data.providerId)
  const provider = await db.provider.findFirst({ where: { id: data.providerId, businessId: auth.businessId } })
  if (!provider) throw badRequest("INVALID_PROVIDER", "Provider not found.", { providerId: ["Provider not found"] })
  await assertNoWindowOverlap(data.providerId, data.dayOfWeek, data.startTime, data.endTime)
  const row = await db.availability.create({ data: { ...data, businessId: auth.businessId } })
  return Response.json({ availability: serializeAvailability(row) }, { status: 201 })
})
