import { requireAdmin } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { parseBody, route } from "@/lib/server/http"
import { businessPatchSchema } from "@/lib/server/schemas"

export const PATCH = route(async (req) => {
  const auth = await requireAdmin()
  const data = await parseBody(req, businessPatchSchema)
  const b = await db.business.update({ where: { id: auth.businessId }, data })
  return { business: { id: b.id, name: b.name, slug: b.slug, timeZone: b.timeZone } }
})
