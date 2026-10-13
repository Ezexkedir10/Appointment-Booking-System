/**
 * Booking-rule integration tests. They run against a real PostgreSQL database because the
 * guarantees under test (advisory locks, transactions, tenant scoping) only exist there.
 * Set TEST_DATABASE_URL (after `prisma migrate deploy`) to run them; otherwise they are skipped.
 */
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import { at, futureDate, loadServer, seedBusiness, TEST_DB_URL } from "./fixtures"

const suite = TEST_DB_URL ? describe : describe.skip

suite("booking rules (PostgreSQL)", () => {
  let s: Awaited<ReturnType<typeof loadServer>>
  let f: Awaited<ReturnType<typeof seedBusiness>>
  const date = futureDate(10)

  const book = (start: Date, over: Partial<{ providerId: string; clientId: string; serviceId: string }> = {}) =>
    s.createAppointment(f.ctx, {
      clientId: f.client.id,
      providerId: f.provider.id,
      serviceId: f.service.id,
      startTime: start,
      ...over,
    })
  const code = (e: unknown) => (e as { code?: string }).code

  before(async () => {
    s = await loadServer()
    f = await seedBusiness(s.db)
  })
  after(async () => {
    await s.db.business.deleteMany({ where: { slug: { startsWith: "test-" } } })
    await s.db.$disconnect()
  })

  it("stores UTC instants and computes end time and buffer on the server", async () => {
    const appt = await book(at(date, "09:00"))
    assert.equal(appt.startTime.toISOString(), at(date, "09:00").toISOString())
    assert.equal(appt.endTime.getTime() - appt.startTime.getTime(), 60 * 60_000)
    assert.equal(appt.blockedUntil.getTime() - appt.endTime.getTime(), 15 * 60_000)
    assert.equal(Number(appt.price), 100)
  })

  it("rejects an overlapping booking and one that lands inside the buffer", async () => {
    await assert.rejects(book(at(date, "09:30")), (e) => code(e) === "SLOT_UNAVAILABLE")
    await assert.rejects(book(at(date, "10:05")), (e) => code(e) === "SLOT_UNAVAILABLE")
    await book(at(date, "10:15")) // exactly when the buffer ends
  })

  it("lets a different provider take the same time", async () => {
    await book(at(date, "09:00"), { providerId: f.otherProvider.id })
  })

  it("rejects times outside availability", async () => {
    await assert.rejects(book(at(date, "08:00")), (e) => code(e) === "OUTSIDE_AVAILABILITY")
    await assert.rejects(book(at(date, "16:30")), (e) => code(e) === "OUTSIDE_AVAILABILITY") // would end 17:30
  })

  it("rejects past times", async () => {
    await assert.rejects(book(new Date(Date.now() - 3_600_000)), (e) => code(e) === "PAST_TIME")
  })

  it("rejects a provider who does not offer the service", async () => {
    const other = await s.db.service.create({
      data: { businessId: f.business.id, name: "Other", duration: 30, bufferTime: 0, price: 10 },
    })
    await assert.rejects(book(at(date, "13:00"), { serviceId: other.id }), (e) => code(e) === "PROVIDER_SERVICE_MISMATCH")
  })

  it("allows exactly one winner when many clients book the same slot at once", async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => book(at(date, "14:00"))))
    const ok = results.filter((r) => r.status === "fulfilled")
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]
    assert.equal(ok.length, 1)
    assert.equal(failed.length, 7)
    assert.ok(failed.every((r) => code(r.reason) === "SLOT_UNAVAILABLE"))
    const rows = await s.db.appointment.count({ where: { providerId: f.provider.id, startTime: at(date, "14:00") } })
    assert.equal(rows, 1)
  })

  it("frees the slot when an appointment is cancelled", async () => {
    const day = futureDate(11)
    const a = await book(at(day, "09:00"))
    const admin = { userId: "u", name: "A", email: "a@x", role: "ADMIN" as const, businessId: f.business.id, providerId: null, businessTimeZone: "America/New_York" }
    await s.updateAppointment(admin, a.id, { status: "cancelled" })
    await book(at(day, "09:00"))
  })

  it("re-checks conflicts when rescheduling and when reopening a cancelled booking", async () => {
    const day = futureDate(12)
    const admin = { userId: "u", name: "A", email: "a@x", role: "ADMIN" as const, businessId: f.business.id, providerId: null, businessTimeZone: "America/New_York" }
    const first = await book(at(day, "09:00"))
    const second = await book(at(day, "11:00"))
    await assert.rejects(s.updateAppointment(admin, second.id, { startTime: at(day, "09:30") }), (e) => code(e) === "SLOT_UNAVAILABLE")
    const moved = await s.updateAppointment(admin, second.id, { startTime: at(day, "13:00") })
    assert.equal(moved.startTime.toISOString(), at(day, "13:00").toISOString())

    await s.updateAppointment(admin, first.id, { status: "cancelled" })
    await book(at(day, "09:00")) // someone else takes it
    await assert.rejects(s.updateAppointment(admin, first.id, { status: "scheduled" }), (e) => code(e) === "SLOT_UNAVAILABLE")
  })

  it("enforces status transitions", async () => {
    const day = futureDate(13)
    const admin = { userId: "u", name: "A", email: "a@x", role: "ADMIN" as const, businessId: f.business.id, providerId: null, businessTimeZone: "America/New_York" }
    const a = await book(at(day, "09:00"))
    await s.updateAppointment(admin, a.id, { status: "completed" })
    await assert.rejects(s.updateAppointment(admin, a.id, { status: "scheduled" }), (e) => code(e) === "INVALID_TRANSITION")
    await assert.rejects(s.updateAppointment(admin, a.id, { startTime: at(day, "10:00") }), (e) => code(e) === "NOT_RESCHEDULABLE")
  })

  it("supports group services up to capacity at the same start time", async () => {
    const g = await seedBusiness(s.db, { capacity: 2 })
    const day = futureDate(14)
    const mk = () => s.createAppointment(g.ctx, { clientId: g.client.id, providerId: g.provider.id, serviceId: g.service.id, startTime: at(day, "09:00") })
    await mk()
    await mk()
    await assert.rejects(mk(), (e) => code(e) === "SLOT_UNAVAILABLE")
  })

  describe("tenant isolation and roles", () => {
    it("never lets one business book another business's provider, service or client", async () => {
      const b = await seedBusiness(s.db)
      await assert.rejects(
        s.createAppointment(b.ctx, { clientId: b.client.id, providerId: f.provider.id, serviceId: b.service.id, startTime: at(date, "15:00") }),
        (e) => code(e) === "INVALID_PROVIDER",
      )
      await assert.rejects(
        s.createAppointment(b.ctx, { clientId: f.client.id, providerId: b.provider.id, serviceId: b.service.id, startTime: at(date, "15:00") }),
        (e) => code(e) === "INVALID_CLIENT",
      )
    })

    it("hides other businesses' appointments from updates (404) and blocks provider users from colleagues' bookings (403)", async () => {
      const day = futureDate(15)
      const appt = await book(at(day, "09:00"))
      const outsider = { userId: "u2", name: "X", email: "x@x", role: "ADMIN" as const, businessId: "someone-else", providerId: null, businessTimeZone: "America/New_York" }
      await assert.rejects(s.updateAppointment(outsider, appt.id, { status: "cancelled" }), (e) => code(e) === "NOT_FOUND")

      const colleague = { userId: "u3", name: "Bo", email: "bo@x", role: "PROVIDER" as const, businessId: f.business.id, providerId: f.otherProvider.id, businessTimeZone: "America/New_York" }
      await assert.rejects(s.updateAppointment(colleague, appt.id, { status: "cancelled" }), (e) => code(e) === "FORBIDDEN")

      const owner = { ...colleague, providerId: f.provider.id }
      await s.updateAppointment(owner, appt.id, { status: "confirmed" })
    })
  })

  it("lists only genuinely free slots, in business time", async () => {
    const day = futureDate(16)
    await book(at(day, "09:00")) // blocks 09:00-10:15
    const slots = await s.listSlots(f.ctx, { providerId: f.provider.id, serviceId: f.service.id, date: day })
    assert.equal(slots[0].startTime, at(day, "10:15").toISOString())
    assert.equal(slots[0].label, "10:15 AM")
  })
})
