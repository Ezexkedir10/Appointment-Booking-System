import { requireAdmin, requireAuth } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { badRequest, parseBody, route } from "@/lib/server/http"
import { providerCreateSchema } from "@/lib/server/schemas"
import { serializeProvider } from "@/lib/server/serializers"

export const GET = route(async () => {
  const auth = await requireAuth()
  const providers = await db.provider.findMany({
    where: {
      businessId: auth.businessId,
      ...(auth.role === "PROVIDER" ? { id: auth.providerId ?? "none" } : {}),
    },
    include: { services: { select: { serviceId: true } } },
    orderBy: { createdAt: "desc" },
  })
  return { providers: providers.map(serializeProvider) }
})

export const POST = route(async (req) => {
  const auth = await requireAdmin()
  const { specialties, ...data } = await parseBody(req, providerCreateSchema)
  const unique = [...new Set(specialties)]
  const valid = await db.service.count({ where: { id: { in: unique }, businessId: auth.businessId } })
  if (valid !== unique.length) {
    throw badRequest("INVALID_SERVICE", "One or more services were not found.", { specialties: ["Unknown service selected"] })
  }
  const provider = await db.provider.create({
    data: { ...data, businessId: auth.businessId, services: { create: unique.map((serviceId) => ({ serviceId })) } },
    include: { services: { select: { serviceId: true } } },
  })
  return Response.json({ provider: serializeProvider(provider) }, { status: 201 })
})
