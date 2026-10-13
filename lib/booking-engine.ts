/**
 * Pure booking rules: time zones, end-time/buffer math, availability windows,
 * overlap detection and slot generation. No database or framework imports so it
 * can be unit tested in isolation.
 *
 * Conventions
 * - Instants are JS Dates (UTC under the hood) and are stored as UTC.
 * - Availability windows are "HH:mm" wall-clock times in the *business* time zone.
 * - An appointment occupies [startTime, endTime) for the service itself and
 *   [startTime, blockedUntil) for conflict purposes, where
 *   blockedUntil = endTime + service buffer.
 */

export interface ServiceTiming {
  duration: number // minutes
  bufferTime: number // minutes
  capacity: number
}

export interface AvailabilityWindow {
  dayOfWeek: number // 0 = Sunday
  startTime: string // "HH:mm" business-local
  endTime: string
  isActive: boolean
}

export interface BusyBlock {
  startTime: Date
  blockedUntil: Date
  serviceId: string
}

export const SLOT_STEP_MINUTES = 15
const MS_PER_MINUTE = 60_000

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE)
}

export function computeTimes(start: Date, service: ServiceTiming) {
  const endTime = addMinutes(start, service.duration)
  const blockedUntil = addMinutes(endTime, service.bufferTime)
  return { startTime: start, endTime, blockedUntil }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  dayOfWeek: number
}

export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
  })
  const map: Record<string, string> = {}
  for (const part of fmt.formatToParts(instant)) map[part.type] = part.value
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    dayOfWeek: weekdays.indexOf(map.weekday),
  }
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * Convert a business-local wall-clock time to a UTC instant.
 * For nonexistent local times (spring-forward gap) this resolves to the instant
 * just after the gap; for ambiguous times (fall-back) it picks the first occurrence.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mm] = timeStr.split(":").map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0)
  // Two passes converge across DST boundaries.
  let utc = guess - zoneOffsetMs(new Date(guess), timeZone)
  utc = guess - zoneOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

/** "YYYY-MM-DD" of the instant in the given zone. */
export function zonedDateKey(instant: Date, timeZone: string): string {
  const p = getZonedParts(instant, timeZone)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

export function zonedMinutesOfDay(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone)
  return p.hour * 60 + p.minute
}

export function dayOfWeekForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function parseHHmm(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return h * 60 + m
}

/**
 * Whether [start, end) (the service portion, not the buffer) lies fully inside one
 * active availability window on the business-local day of `start`.
 */
export function isWithinAvailability(
  start: Date,
  end: Date,
  windows: AvailabilityWindow[],
  timeZone: string,
): boolean {
  const dateKey = zonedDateKey(start, timeZone)
  const dow = dayOfWeekForDate(dateKey)
  return windows
    .filter((w) => w.isActive && w.dayOfWeek === dow)
    .some((w) => {
      const windowStart = zonedTimeToUtc(dateKey, w.startTime, timeZone)
      const windowEnd = zonedTimeToUtc(dateKey, w.endTime, timeZone)
      return start >= windowStart && end <= windowEnd
    })
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Decide whether a candidate booking conflicts with existing busy blocks for the
 * same provider. Services with capacity > 1 may share an identical start time
 * (group sessions) up to `capacity` bookings; any other overlap is a conflict.
 */
export function hasConflict(
  candidate: { startTime: Date; blockedUntil: Date; serviceId: string },
  service: ServiceTiming,
  existing: BusyBlock[],
): boolean {
  const overlapping = existing.filter((b) =>
    rangesOverlap(candidate.startTime, candidate.blockedUntil, b.startTime, b.blockedUntil),
  )
  if (overlapping.length === 0) return false
  if (service.capacity <= 1) return true
  const sameSession = overlapping.every(
    (b) => b.serviceId === candidate.serviceId && b.startTime.getTime() === candidate.startTime.getTime(),
  )
  return !sameSession || overlapping.length >= service.capacity
}

/** Candidate start instants for one business-local date, before conflict filtering. */
export function generateSlots(params: {
  dateStr: string
  timeZone: string
  windows: AvailabilityWindow[]
  service: ServiceTiming & { id: string }
  busy: BusyBlock[]
  now: Date
  stepMinutes?: number
}): Date[] {
  const { dateStr, timeZone, windows, service, busy, now } = params
  const step = params.stepMinutes ?? SLOT_STEP_MINUTES
  const dow = dayOfWeekForDate(dateStr)
  const slots: Date[] = []

  for (const w of windows.filter((x) => x.isActive && x.dayOfWeek === dow)) {
    const windowStart = zonedTimeToUtc(dateStr, w.startTime, timeZone)
    const windowEnd = zonedTimeToUtc(dateStr, w.endTime, timeZone)
    for (
      let cursor = windowStart;
      addMinutes(cursor, service.duration) <= windowEnd;
      cursor = addMinutes(cursor, step)
    ) {
      if (cursor <= now) continue
      const t = computeTimes(cursor, service)
      if (hasConflict({ ...t, serviceId: service.id }, service, busy)) continue
      slots.push(cursor)
    }
  }

  const seen = new Set<number>()
  return slots
    .filter((s) => (seen.has(s.getTime()) ? false : (seen.add(s.getTime()), true)))
    .sort((a, b) => a.getTime() - b.getTime())
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}
