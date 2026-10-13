import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { appointmentCreateSchema, availabilityCreateSchema, clientCreateSchema, serviceCreateSchema } from "../../lib/server/schemas"

describe("request validation", () => {
  it("rejects malformed emails and empty names with field-level messages", () => {
    const r = clientCreateSchema.safeParse({ name: "", email: "nope" })
    assert.equal(r.success, false)
    if (!r.success) {
      const f = r.error.flatten().fieldErrors
      assert.ok(f.name && f.email)
    }
  })
  it("normalises emails and applies defaults", () => {
    const r = clientCreateSchema.parse({ name: "Ann", email: "  ANN@Example.COM " })
    assert.equal(r.email, "ann@example.com")
    assert.equal(r.segment, "new")
    assert.deepEqual(r.tags, [])
  })
  it("rejects nonsense service numbers", () => {
    assert.equal(serviceCreateSchema.safeParse({ name: "x", duration: 0, price: 10 }).success, false)
    assert.equal(serviceCreateSchema.safeParse({ name: "x", duration: 30, price: -5 }).success, false)
    assert.equal(serviceCreateSchema.safeParse({ name: "x", duration: 30, price: 5, color: "red" }).success, false)
  })
  it("requires HH:mm availability with end after start", () => {
    const base = { providerId: "p", dayOfWeek: 1, isActive: true }
    assert.equal(availabilityCreateSchema.safeParse({ ...base, startTime: "9:00", endTime: "17:00" }).success, false)
    assert.equal(availabilityCreateSchema.safeParse({ ...base, startTime: "17:00", endTime: "09:00" }).success, false)
    assert.equal(availabilityCreateSchema.safeParse({ ...base, startTime: "09:00", endTime: "17:00" }).success, true)
  })
  it("requires an ISO timestamp with offset for appointment start", () => {
    const base = { clientId: "c", providerId: "p", serviceId: "s" }
    assert.equal(appointmentCreateSchema.safeParse({ ...base, startTime: "2026-07-25T10:00" }).success, false)
    const ok = appointmentCreateSchema.parse({ ...base, startTime: "2026-07-25T14:00:00.000Z" })
    assert.ok(ok.startTime instanceof Date)
  })
})
