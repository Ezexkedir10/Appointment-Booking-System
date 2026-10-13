import { requireAuth } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { parseBody, route } from "@/lib/server/http"
import { clientCreateSchema } from "@/lib/server/schemas"
import { segmentToDb, serializeClient } from "@/lib/server/serializers"

export const GET = route(async () => {
  const auth = await requireAuth()
  const clients = await db.client.findMany({
    where: {
      businessId: auth.businessId,
      // Providers only see clients they are booked with.
      ...(auth.role === "PROVIDER" ? { appointments: { some: { providerId: auth.providerId ?? "none" } } } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  return { clients: clients.map(serializeClient) }
})

export const POST = route(async (req) => {
  const auth = await requireAuth()
  const data = await parseBody(req, clientCreateSchema)
  const client = await db.client.create({
    data: { ...data, segment: segmentToDb(data.segment), businessId: auth.businessId },
  })
  return Response.json({ client: serializeClient(client) }, { status: 201 })
})
