import { db } from "./db"
import { conflict } from "./http"

/** Reject a window that overlaps another window for the same provider and weekday. */
export async function assertNoWindowOverlap(
  providerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  const clash = await db.availability.findFirst({
    where: {
      providerId,
      dayOfWeek,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  if (clash) {
    throw conflict("WINDOW_OVERLAP", `This overlaps an existing window (${clash.startTime}–${clash.endTime}) on the same day.`)
  }
}
