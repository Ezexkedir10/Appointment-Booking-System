import type { AppointmentStatus } from "./types"

/** Which status changes are allowed. Enforced by the API and used by the UI to disable invalid buttons. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "completed", "cancelled", "no-show"],
  confirmed: ["scheduled", "completed", "cancelled", "no-show"],
  completed: [],
  cancelled: ["scheduled"],
  "no-show": ["scheduled"],
}

export const canTransition = (from: AppointmentStatus, to: AppointmentStatus) =>
  from === to || APPOINTMENT_TRANSITIONS[from].includes(to)

export const isReschedulable = (status: AppointmentStatus) => status === "scheduled" || status === "confirmed"
