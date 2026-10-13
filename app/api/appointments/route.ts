import { assertProviderAccess, requireAuth } from "@/lib/server/auth"
import { createAppointment } from "@/lib/server/booking-service"
import { db } from "@/lib/server/db"
import { parseBody, parseQuery, route } from "@/lib/server/http"
import { appointmentCreateSchema, appointmentQuerySchema } from "@/lib/server/schemas"
import { serializeAppointment, statusToDb } from "@/lib/server/serializers"

export const GET = route(async (req) => {
  const auth = await requireAuth()
  const q = parseQuery(req, appointmentQuerySchema)
  const rows = await db.appointment.findMany({
    where: {
      businessId: auth.businessId,
      ...(auth.role === "PROVIDER" ? { providerId: auth.providerId ?? "none" } : q.providerId ? { providerId: q.providerId } : {}),
      ...(q.clientId ? { clientId: q.clientId } : {}),
      ...(q.status ? { status: statusToDb(q.status) } : {}),
      ...(q.from || q.to ? { startTime: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: q.to } : {}) } } : {}),
    },
    orderBy: { startTime: "desc" },
    take: q.limit,
  })
  return { appointments: rows.map(serializeAppointment) }
})

export const POST = route(async (req) => {
  const auth = await requireAuth()
  const input = await parseBody(req, appointmentCreateSchema)
  assertProviderAccess(auth, input.providerId)
  const appt = await createAppointment(
    { businessId: auth.businessId, timeZone: auth.businessTimeZone },
    { ...input, status: input.status === "confirmed" ? "confirmed" : "scheduled" },
  )
  return Response.json({ appointment: serializeAppointment(appt) }, { status: 201 })
})
