import { requireAdmin } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { badRequest, notFound, parseBody, route } from "@/lib/server/http"
import { providerUpdateSchema } from "@/lib/server/schemas"
import { serializeProvider } from "@/lib/server/serializers"

export const PATCH = route(async (req, ctx) => {
  const auth = await requireAdmin()
  const { id } = await ctx.params
  const { specialties, ...data } = await parseBody(req, providerUpdateSchema)

  const existing = await db.provider.findFirst({ where: { id, businessId: auth.businessId } })
  if (!existing) throw notFound("Provider")

  const unique = specialties ? [...new Set(specialties)] : undefined
  if (unique) {
    const valid = await db.service.count({ where: { id: { in: unique }, businessId: auth.businessId } })
    if (valid !== unique.length) {
      throw badRequest("INVALID_SERVICE", "One or more services were not found.", { specialties: ["Unknown service selected"] })
    }
  }

  const provider = await db.provider.update({
    where: { id },
    data: {
      ...data,
      ...(unique ? { services: { deleteMany: {}, create: unique.map((serviceId) => ({ serviceId })) } } : {}),
    },
    include: { services: { select: { serviceId: true } } },
  })
  return { provider: serializeProvider(provider) }
})
