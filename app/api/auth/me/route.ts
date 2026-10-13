import { requireAuth } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { route } from "@/lib/server/http"

export const GET = route(async () => {
  const auth = await requireAuth()
  const business = await db.business.findUniqueOrThrow({ where: { id: auth.businessId } })
  return {
    user: { id: auth.userId, name: auth.name, email: auth.email, role: auth.role, providerId: auth.providerId },
    business: { id: business.id, name: business.name, slug: business.slug, timeZone: business.timeZone },
  }
})
