import { assertProviderAccess, requireAuth } from "@/lib/server/auth"
import { assertNoWindowOverlap } from "@/lib/server/availability-service"
import { db } from "@/lib/server/db"
import { badRequest, notFound, parseBody, route } from "@/lib/server/http"
import { availabilityUpdateSchema } from "@/lib/server/schemas"
import { serializeAvailability } from "@/lib/server/serializers"

async function load(id: string, businessId: string) {
  const row = await db.availability.findFirst({ where: { id, businessId } })
  if (!row) throw notFound("Availability window")
  return row
}

export const PATCH = route(async (req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx.params
  const existing = await load(id, auth.businessId)
  assertProviderAccess(auth, existing.providerId)
  const patch = await parseBody(req, availabilityUpdateSchema)
  const next = { ...existing, ...patch }
  if (next.startTime >= next.endTime) {
    throw badRequest("VALIDATION_ERROR", "End time must be after start time.", { endTime: ["End time must be after start time"] })
  }
  await assertNoWindowOverlap(existing.providerId, next.dayOfWeek, next.startTime, next.endTime, id)
  const row = await db.availability.update({ where: { id }, data: patch })
  return { availability: serializeAvailability(row) }
})

export const DELETE = route(async (_req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx.params
  const existing = await load(id, auth.businessId)
  assertProviderAccess(auth, existing.providerId)
  await db.availability.delete({ where: { id } })
  return { ok: true }
})
