import { db } from "@/lib/server/db"
import { notFound, route } from "@/lib/server/http"

/** Public catalog for the customer booking page: active services and who offers them. */
export const GET = route(async (_req, ctx) => {
  const { slug } = await ctx.params
  const business = await db.business.findUnique({ where: { slug } })
  if (!business) throw notFound("Business")
  const services = await db.service.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: {
      providers: {
        where: { provider: { isActive: true } },
        include: { provider: { select: { id: true, name: true, role: true } } },
      },
    },
  })
  return {
    business: { name: business.name, timeZone: business.timeZone },
    services: services.map((s) => ({
      id: s.id, name: s.name, description: s.description, duration: s.duration, price: Number(s.price),
      category: s.category, color: s.color,
      providers: s.providers.map((p) => p.provider),
    })),
  }
})
