import { requireAdmin } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { notFound, parseBody, route } from "@/lib/server/http"
import { clientUpdateSchema } from "@/lib/server/schemas"
import { segmentToDb, serializeClient } from "@/lib/server/serializers"

export const PATCH = route(async (req, ctx) => {
  const auth = await requireAdmin()
  const { id } = await ctx.params
  const { segment, ...rest } = await parseBody(req, clientUpdateSchema)
  const result = await db.client.updateMany({
    where: { id, businessId: auth.businessId },
    data: { ...rest, ...(segment ? { segment: segmentToDb(segment) } : {}) },
  })
  if (result.count === 0) throw notFound("Client")
  return { client: serializeClient(await db.client.findUniqueOrThrow({ where: { id } })) }
})

export const DELETE = route(async (_req, ctx) => {
  const auth = await requireAdmin()
  const { id } = await ctx.params
  const result = await db.client.deleteMany({ where: { id, businessId: auth.businessId } })
  if (result.count === 0) throw notFound("Client")
  return { ok: true }
})
