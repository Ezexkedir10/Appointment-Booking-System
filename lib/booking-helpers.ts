import { zonedDateKey } from "./booking-engine"
import type { Appointment, AppointmentStatus, Availability, Client, Provider, Service } from "./types"

/** Business time zone used to render every timestamp; set once the session loads. */
let displayTimeZone: string | undefined
export function setDisplayTimeZone(timeZone: string) {
  displayTimeZone = timeZone
}
export const getDisplayTimeZone = () => displayTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

export const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompactDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: displayTimeZone,
  })
}

export function formatDateTime(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: displayTimeZone,
  })
}

export function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: displayTimeZone,
  })
}

export function getClientStats(client: Client, appointments: Appointment[]) {
  const clientAppointments = appointments.filter((appointment) => appointment.clientId === client.id)
  const completed = clientAppointments.filter((appointment) => appointment.status === "completed")
  const lifetimeValue = completed.reduce((sum, appointment) => sum + appointment.price, 0)
  const lastVisit = completed
    .slice()
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]

  return {
    totalAppointments: clientAppointments.length,
    completedAppointments: completed.length,
    lifetimeValue,
    lastVisit: lastVisit?.startTime,
  }
}

export function getProviderStats(provider: Provider, appointments: Appointment[]) {
  const providerAppointments = appointments.filter((appointment) => appointment.providerId === provider.id)
  const completed = providerAppointments.filter((appointment) => appointment.status === "completed")
  const revenue = completed.reduce((sum, appointment) => sum + appointment.price, 0)
  const utilization = Math.min(100, Math.round((providerAppointments.length / 10) * 100))

  return {
    activeBookings: providerAppointments.filter((appointment) => appointment.status !== "cancelled").length,
    completedBookings: completed.length,
    revenue,
    utilization,
  }
}

export function getServiceBookingCount(service: Service, appointments: Appointment[]) {
  return appointments.filter((appointment) => appointment.serviceId === service.id).length
}

export function getStatusTone(status: AppointmentStatus) {
  switch (status) {
    case "scheduled":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "completed":
      return "bg-slate-200 text-slate-800 border-slate-300"
    case "cancelled":
      return "bg-rose-100 text-rose-800 border-rose-200"
    case "no-show":
      return "bg-amber-100 text-amber-800 border-amber-200"
  }
}

export function getRevenue(appointments: Appointment[]) {
  return appointments
    .filter((appointment) => appointment.status === "completed")
    .reduce((sum, appointment) => sum + appointment.price, 0)
}

export function getTodayAppointments(appointments: Appointment[]) {
  const tz = getDisplayTimeZone()
  const today = zonedDateKey(new Date(), tz)
  return appointments.filter((appointment) => zonedDateKey(appointment.startTime, tz) === today)
}

export function getUpcomingAppointments(appointments: Appointment[]) {
  const now = new Date()
  return appointments
    .filter((appointment) => appointment.startTime >= now && appointment.status !== "cancelled")
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

export function getWeeklyUtilization(provider: Provider, availability: Availability[], appointments: Appointment[]) {
  const providerAvailability = availability.filter((slot) => slot.providerId === provider.id && slot.isActive)
  const providerAppointments = appointments.filter(
    (appointment) => appointment.providerId === provider.id && appointment.status !== "cancelled",
  )

  const totalOpenHours = providerAvailability.reduce((sum, slot) => {
    const [startHour, startMinutes] = slot.startTime.split(":").map(Number)
    const [endHour, endMinutes] = slot.endTime.split(":").map(Number)
    return sum + (endHour * 60 + endMinutes - (startHour * 60 + startMinutes)) / 60
  }, 0)

  const bookedHours = providerAppointments.reduce(
    (sum, appointment) => sum + (appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60 * 60),
    0,
  )

  if (!totalOpenHours) {
    return 0
  }

  return Math.min(100, Math.round((bookedHours / totalOpenHours) * 100))
}
