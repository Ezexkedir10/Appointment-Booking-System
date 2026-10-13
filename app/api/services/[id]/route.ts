import { requireAdmin } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { notFound, parseBody, route } from "@/lib/server/http"
import { serviceUpdateSchema } from "@/lib/server/schemas"
import { serializeService } from "@/lib/server/serializers"

export const PATCH = route(async (req, ctx) => {
  const auth = await requireAdmin()
  const { id } = await ctx.params
  const data = await parseBody(req, serviceUpdateSchema)
  const result = await db.service.updateMany({ where: { id, businessId: auth.businessId }, data })
  if (result.count === 0) throw notFound("Service")
  const service = await db.service.findUniqueOrThrow({ where: { id } })
  return { service: serializeService(service) }
})

export const DELETE = route(async (_req, ctx) => {
  const auth = await requireAdmin()
  const { id } = await ctx.params
  const result = await db.service.deleteMany({ where: { id, businessId: auth.businessId } })
  if (result.count === 0) throw notFound("Service")
  return { ok: true }
})
