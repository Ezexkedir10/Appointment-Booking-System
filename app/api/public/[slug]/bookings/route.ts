import { createPublicBooking } from "@/lib/server/booking-service"
import { ApiError, parseBody, route } from "@/lib/server/http"
import { rateLimit } from "@/lib/server/rate-limit"
import { publicBookingSchema } from "@/lib/server/schemas"

export const POST = route(async (req, ctx) => {
  const { slug } = await ctx.params
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  if (!rateLimit(`book:${ip}`, 10, 10 * 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many booking attempts. Please try again later.")
  }
  const input = await parseBody(req, publicBookingSchema)
  const { appointment, business } = await createPublicBooking(slug, input)
  // Deliberately minimal: an unauthenticated caller only gets their own confirmation.
  return Response.json(
    { booking: { id: appointment.id, startTime: appointment.startTime.toISOString(), endTime: appointment.endTime.toISOString(), timeZone: business.timeZone } },
    { status: 201 },
  )
})
