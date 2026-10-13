import { requireAuth } from "@/lib/server/auth"
import { updateAppointment } from "@/lib/server/booking-service"
import { parseBody, route } from "@/lib/server/http"
import { appointmentUpdateSchema } from "@/lib/server/schemas"
import { serializeAppointment } from "@/lib/server/serializers"

export const PATCH = route(async (req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx.params
  const patch = await parseBody(req, appointmentUpdateSchema)
  const appt = await updateAppointment(auth, id, patch)
  return { appointment: serializeAppointment(appt) }
})
