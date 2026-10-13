import type {
  Appointment as DbAppointment,
  AppointmentStatus as DbStatus,
  Availability as DbAvailability,
  BookingChannel as DbChannel,
  Client as DbClient,
  ClientSegment as DbSegment,
  Provider as DbProvider,
  Service as DbService,
} from "@prisma/client"
import type {
  Appointment,
  AppointmentStatus,
  Availability,
  BookingChannel,
  Client,
  ClientSegment,
  Provider,
  Service,
} from "../types"

// The UI uses hyphenated values ("no-show"); Postgres enums use underscores.
export const statusToDb = (s: AppointmentStatus): DbStatus => s.replace("-", "_") as DbStatus
export const statusFromDb = (s: DbStatus): AppointmentStatus => s.replace("_", "-") as AppointmentStatus
export const channelToDb = (c: BookingChannel): DbChannel => c.replace("-", "_") as DbChannel
export const channelFromDb = (c: DbChannel): BookingChannel => c.replace("_", "-") as BookingChannel
export const segmentToDb = (s: ClientSegment): DbSegment => s.replace("-", "_") as DbSegment
export const segmentFromDb = (s: DbSegment): ClientSegment => s.replace("_", "-") as ClientSegment

export const serializeService = (s: DbService): Omit<Service, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string } => ({
  id: s.id, name: s.name, description: s.description, duration: s.duration, price: Number(s.price),
  category: s.category, color: s.color, bufferTime: s.bufferTime, capacity: s.capacity,
  isActive: s.isActive, featured: s.featured, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
})

export const serializeProvider = (p: DbProvider & { services: { serviceId: string }[] }) => ({
  id: p.id, name: p.name, role: p.role, email: p.email, phone: p.phone, bio: p.bio,
  specialties: p.services.map((s) => s.serviceId), rating: p.rating, utilizationTarget: p.utilizationTarget,
  isActive: p.isActive, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
})

export const serializeClient = (c: DbClient) => ({
  id: c.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes,
  segment: segmentFromDb(c.segment), preferredContact: c.preferredContact, tags: c.tags,
  createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
})

export const serializeAvailability = (a: DbAvailability) => ({
  id: a.id, providerId: a.providerId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, isActive: a.isActive,
})

export const serializeAppointment = (a: DbAppointment) => ({
  id: a.id, clientId: a.clientId, providerId: a.providerId, serviceId: a.serviceId,
  startTime: a.startTime.toISOString(), endTime: a.endTime.toISOString(), blockedUntil: a.blockedUntil.toISOString(),
  status: statusFromDb(a.status), paymentStatus: a.paymentStatus, channel: channelFromDb(a.channel),
  notes: a.notes, price: Number(a.price), location: a.location,
  createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
})

export type { Appointment, Availability, Client, Provider, Service }
