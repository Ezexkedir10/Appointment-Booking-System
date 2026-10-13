import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computeTimes,
  generateSlots,
  hasConflict,
  isWithinAvailability,
  zonedDateKey,
  zonedTimeToUtc,
  type AvailabilityWindow,
} from "../../lib/booking-engine"

const NY = "America/New_York"
const svc = { id: "s1", duration: 60, bufferTime: 15, capacity: 1 }
const mondayWindow: AvailabilityWindow = { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", isActive: true }

describe("time zones", () => {
  it("converts business-local time to UTC in winter (EST, UTC-5)", () => {
    assert.equal(zonedTimeToUtc("2026-01-12", "09:00", NY).toISOString(), "2026-01-12T14:00:00.000Z")
  })
  it("converts business-local time to UTC in summer (EDT, UTC-4)", () => {
    assert.equal(zonedTimeToUtc("2026-07-13", "09:00", NY).toISOString(), "2026-07-13T13:00:00.000Z")
  })
  it("handles the spring-forward day (offset changes mid-day)", () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 in New York
    assert.equal(zonedTimeToUtc("2026-03-08", "01:00", NY).toISOString(), "2026-03-08T06:00:00.000Z")
    assert.equal(zonedTimeToUtc("2026-03-08", "04:00", NY).toISOString(), "2026-03-08T08:00:00.000Z")
  })
  it("derives the business-local calendar date, not the UTC date", () => {
    // 02:00 UTC on the 14th is still the 13th in New York
    assert.equal(zonedDateKey(new Date("2026-07-14T02:00:00Z"), NY), "2026-07-13")
  })
  it("works for zones east of UTC", () => {
    assert.equal(zonedTimeToUtc("2026-07-13", "09:00", "Africa/Addis_Ababa").toISOString(), "2026-07-13T06:00:00.000Z")
  })
})

describe("computeTimes", () => {
  it("adds duration for endTime and buffer for blockedUntil", () => {
    const t = computeTimes(new Date("2026-07-13T13:00:00Z"), svc)
    assert.equal(t.endTime.toISOString(), "2026-07-13T14:00:00.000Z")
    assert.equal(t.blockedUntil.toISOString(), "2026-07-13T14:15:00.000Z")
  })
})

describe("isWithinAvailability", () => {
  const start = zonedTimeToUtc("2026-07-13", "09:00", NY) // a Monday
  it("accepts a booking fully inside the window", () => {
    const t = computeTimes(start, svc)
    assert.equal(isWithinAvailability(t.startTime, t.endTime, [mondayWindow], NY), true)
  })
  it("rejects a booking that runs past the window end", () => {
    const late = zonedTimeToUtc("2026-07-13", "11:30", NY)
    const t = computeTimes(late, svc)
    assert.equal(isWithinAvailability(t.startTime, t.endTime, [mondayWindow], NY), false)
  })
  it("allows the buffer to extend past the window end", () => {
    const last = zonedTimeToUtc("2026-07-13", "11:00", NY)
    const t = computeTimes(last, svc)
    assert.equal(isWithinAvailability(t.startTime, t.endTime, [mondayWindow], NY), true)
  })
  it("rejects other weekdays and inactive windows", () => {
    const t = computeTimes(zonedTimeToUtc("2026-07-14", "09:00", NY), svc)
    assert.equal(isWithinAvailability(t.startTime, t.endTime, [mondayWindow], NY), false)
    const t2 = computeTimes(start, svc)
    assert.equal(isWithinAvailability(t2.startTime, t2.endTime, [{ ...mondayWindow, isActive: false }], NY), false)
  })
})

describe("hasConflict", () => {
  const base = zonedTimeToUtc("2026-07-13", "09:00", NY)
  const existing = [{ ...computeTimes(base, svc), serviceId: "s1" }]
  const cand = (start: Date) => ({ ...computeTimes(start, svc), serviceId: "s1" })

  it("detects direct overlap", () => {
    assert.equal(hasConflict(cand(base), svc, existing), true)
  })
  it("treats the buffer as blocked time", () => {
    const inBuffer = new Date(base.getTime() + 65 * 60_000) // 10:05, inside 10:00-10:15 buffer
    assert.equal(hasConflict(cand(inBuffer), svc, existing), true)
  })
  it("allows a booking that starts exactly when the buffer ends", () => {
    const afterBuffer = new Date(base.getTime() + 75 * 60_000) // 10:15
    assert.equal(hasConflict(cand(afterBuffer), svc, existing), false)
  })
  it("allows group sessions up to capacity at the same start", () => {
    const group = { ...svc, capacity: 2 }
    assert.equal(hasConflict(cand(base), group, existing), false)
    const full = [existing[0], existing[0]]
    assert.equal(hasConflict(cand(base), group, full), true)
  })
  it("never allows partial overlap for group services", () => {
    const group = { ...svc, capacity: 5 }
    const shifted = new Date(base.getTime() + 30 * 60_000)
    assert.equal(hasConflict(cand(shifted), group, existing), true)
  })
})

describe("generateSlots", () => {
  const now = new Date("2026-07-01T00:00:00Z")
  it("lists 15-minute-grid starts that fit the window", () => {
    const slots = generateSlots({
      dateStr: "2026-07-13", timeZone: NY, windows: [mondayWindow], service: svc, busy: [], now,
    })
    assert.equal(slots[0].toISOString(), "2026-07-13T13:00:00.000Z") // 09:00 EDT
    assert.equal(slots[slots.length - 1].toISOString(), "2026-07-13T15:00:00.000Z") // 11:00 EDT last
    assert.equal(slots.length, 9)
  })
  it("removes slots that collide with existing bookings and their buffers", () => {
    const busyStart = zonedTimeToUtc("2026-07-13", "09:00", NY)
    const slots = generateSlots({
      dateStr: "2026-07-13", timeZone: NY, windows: [mondayWindow], service: svc,
      busy: [{ ...computeTimes(busyStart, svc), serviceId: "s1" }], now,
    })
    assert.equal(slots[0].toISOString(), "2026-07-13T14:15:00.000Z") // 10:15 EDT
  })
  it("hides slots in the past", () => {
    const slots = generateSlots({
      dateStr: "2026-07-13", timeZone: NY, windows: [mondayWindow], service: svc, busy: [],
      now: new Date("2026-07-13T14:00:00Z"),
    })
    assert.equal(slots[0].toISOString(), "2026-07-13T14:15:00.000Z")
  })
  it("returns nothing on days without a window", () => {
    assert.deepEqual(
      generateSlots({ dateStr: "2026-07-14", timeZone: NY, windows: [mondayWindow], service: svc, busy: [], now }),
      [],
    )
  })
})
