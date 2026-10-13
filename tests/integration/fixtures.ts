import { randomUUID } from "node:crypto"
import { zonedTimeToUtc } from "../../lib/booking-engine"

export const TEST_DB_URL = process.env.TEST_DATABASE_URL
export const TZ = "America/New_York"

/** Loads the Prisma client against the *test* database. Must be called before importing server modules. */
export async function loadServer() {
  process.env.DATABASE_URL = TEST_DB_URL
  const [{ db }, booking, http] = await Promise.all([
    import("../../lib/server/db"),
    import("../../lib/server/booking-service"),
    import("../../lib/server/http"),
  ])
  return { db, ...booking, ApiError: http.ApiError }
}

/** A calendar date `daysAhead` days from now (business-local), so slots are always in the future. */
export function futureDate(daysAhead = 10): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export const at = (date: string, hhmm: string) => zonedTimeToUtc(date, hhmm, TZ)

/** Creates an isolated business with one service (60 min + 15 min buffer), one provider and 7-day 09:00-17:00 availability. */
export async function seedBusiness(db: Awaited<ReturnType<typeof loadServer>>["db"], opts: { capacity?: number } = {}) {
  const tag = randomUUID().slice(0, 8)
  const business = await db.business.create({ data: { name: `Test ${tag}`, slug: `test-${tag}`, timeZone: TZ } })
  const service = await db.service.create({
    data: { businessId: business.id, name: "Consult", duration: 60, bufferTime: 15, price: 100, capacity: opts.capacity ?? 1 },
  })
  const makeProvider = async (name: string) => {
    const provider = await db.provider.create({
      data: { businessId: business.id, name, email: `${name.toLowerCase()}-${tag}@example.com`, services: { create: [{ serviceId: service.id }] } },
    })
    await db.availability.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ businessId: business.id, providerId: provider.id, dayOfWeek, startTime: "09:00", endTime: "17:00" })),
    })
    return provider
  }
  const provider = await makeProvider("Ada")
  const otherProvider = await makeProvider("Bo")
  const client = await db.client.create({ data: { businessId: business.id, name: "Cleo", email: `cleo-${tag}@example.com` } })
  return { business, service, provider, otherProvider, client, ctx: { businessId: business.id, timeZone: TZ } }
}
