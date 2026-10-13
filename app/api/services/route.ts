import { requireAdmin, requireAuth } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { parseBody, route } from "@/lib/server/http"
import { serviceCreateSchema } from "@/lib/server/schemas"
import { serializeService } from "@/lib/server/serializers"

export const GET = route(async () => {
  const auth = await requireAuth()
  const services = await db.service.findMany({
    where: { businessId: auth.businessId, ...(auth.role === "PROVIDER" ? { isActive: true } : {}) },
    orderBy: { createdAt: "desc" },
  })
  return { services: services.map(serializeService) }
})

export const POST = route(async (req) => {
  const auth = await requireAdmin()
  const data = await parseBody(req, serviceCreateSchema)
  const service = await db.service.create({ data: { ...data, businessId: auth.businessId } })
  return Response.json({ service: serializeService(service) }, { status: 201 })
})
