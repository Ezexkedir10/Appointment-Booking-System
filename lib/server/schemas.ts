import { z } from "zod"
import { isValidDateKey, isValidTimeZone } from "../booking-engine"

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)")
const isoDate = z.string().datetime({ offset: true, message: "Must be an ISO 8601 date-time" }).transform((v) => new Date(v))
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb color")

export const statusEnum = z.enum(["scheduled", "confirmed", "completed", "cancelled", "no-show"])
export const paymentEnum = z.enum(["paid", "pending", "refunded"])
export const channelEnum = z.enum(["website", "phone", "walk-in", "partner"])
export const segmentEnum = z.enum(["vip", "returning", "new", "at-risk"])
export const contactEnum = z.enum(["email", "phone", "sms"])

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) })

export const businessPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timeZone: z.string().refine(isValidTimeZone, "Unknown IANA time zone").optional(),
})

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(1000).default(""),
  duration: z.number().int().min(5, "At least 5 minutes").max(720),
  price: z.number().min(0).max(100000),
  category: z.string().trim().min(1).max(60).default("General"),
  color: hexColor.default("#2563eb"),
  bufferTime: z.number().int().min(0).max(240).default(10),
  capacity: z.number().int().min(1).max(100).default(1),
  featured: z.boolean().default(false),
})
export const serviceUpdateSchema = serviceCreateSchema.partial().extend({ isActive: z.boolean().optional() })

export const providerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(40).default(""),
  role: z.string().trim().min(1).max(80).default("Provider"),
  bio: z.string().trim().max(1000).default(""),
  specialties: z.array(z.string()).default([]), // service ids
  rating: z.number().min(0).max(5).optional(),
  utilizationTarget: z.number().int().min(0).max(100).optional(),
})
export const providerUpdateSchema = providerCreateSchema.partial().extend({ isActive: z.boolean().optional() })

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(2000).default(""),
  segment: segmentEnum.default("new"),
  preferredContact: contactEnum.default("email"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
})
export const clientUpdateSchema = clientCreateSchema.partial()

export const availabilityCreateSchema = z
  .object({
    providerId: z.string().min(1),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: hhmm,
    endTime: hhmm,
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.startTime < v.endTime, { message: "End time must be after start time", path: ["endTime"] })
export const availabilityUpdateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
  isActive: z.boolean().optional(),
})

export const appointmentCreateSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  providerId: z.string().min(1, "Choose a provider"),
  serviceId: z.string().min(1, "Choose a service"),
  startTime: isoDate,
  notes: z.string().trim().max(2000).default(""),
  status: statusEnum.optional(),
  paymentStatus: paymentEnum.optional(),
  channel: channelEnum.default("phone"),
  location: z.string().trim().max(120).default("Main Studio"),
})

export const appointmentUpdateSchema = z.object({
  startTime: isoDate.optional(),
  providerId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  status: statusEnum.optional(),
  paymentStatus: paymentEnum.optional(),
  channel: channelEnum.optional(),
  notes: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
})

export const appointmentQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  status: statusEnum.optional(),
  providerId: z.string().optional(),
  clientId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})

export const slotsQuerySchema = z.object({
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().refine(isValidDateKey, "Use YYYY-MM-DD"),
  /** When rescheduling, ignore this appointment's own block. */
  excludeAppointmentId: z.string().optional(),
})

export const publicBookingSchema = z.object({
  serviceId: z.string().min(1),
  providerId: z.string().min(1),
  startTime: isoDate,
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(1000).default(""),
})
export const publicSlotsQuerySchema = slotsQuerySchema.omit({ excludeAppointmentId: true })
