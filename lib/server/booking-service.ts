import type { AppointmentStatus as DbStatus, Prisma } from "@prisma/client"
import type { AuthContext } from "./auth"
import { assertProviderAccess } from "./auth"
import {
  computeTimes,
  generateSlots,
  hasConflict,
  isWithinAvailability,
  zonedTimeToUtc,
  addMinutes,
} from "../booking-engine"
import { db } from "./db"
import { badRequest, conflict, notFound } from "./http"
import { APPOINTMENT_TRANSITIONS } from "../appointment-rules"
import { channelToDb, statusFromDb, statusToDb } from "./serializers"

/** Statuses that occupy a provider's time. Cancelled and no-show free the slot. */
export const BLOCKING_STATUSES: DbStatus[] = ["scheduled", "confirmed", "completed"]

export interface TenantContext {
  businessId: string
  timeZone: string
}

type Tx = Prisma.TransactionClient

/**
 * Serialise all booking writes for a provider. The advisory lock is released at
 * commit/rollback, so concurrent attempts for the same provider queue up and the
 * second one sees the first one's committed row when it runs its conflict check.
 * Ids are locked in sorted order so two transactions can never deadlock.
 */
async function lockProviders(tx: Tx, providerIds: string[]) {
  for (const id of [...new Set(providerIds)].sort()) {
    await tx.$queryRaw`SELECT 1 AS acquired FROM (SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))) AS provider_lock`
  }
}

async function loadBookable(tx: Tx, ctx: TenantContext, providerId: string, serviceId: string) {
  const [provider, service] = await Promise.all([
    tx.provider.findFirst({
      where: { id: providerId, businessId: ctx.businessId },
      include: { services: { select: { serviceId: true } } },
    }),
    tx.service.findFirst({ where: { id: serviceId, businessId: ctx.businessId } }),
  ])
  if (!provider) throw badRequest("INVALID_PROVIDER", "Provider not found.", { providerId: ["Provider not found"] })
  if (!service) throw badRequest("INVALID_SERVICE", "Service not found.", { serviceId: ["Service not found"] })
  if (!provider.isActive) throw conflict("PROVIDER_INACTIVE", "This provider is not accepting bookings.")
  if (!service.isActive) throw conflict("SERVICE_INACTIVE", "This service is not currently offered.")
  if (!provider.services.some((s) => s.serviceId === service.id)) {
    throw conflict("PROVIDER_SERVICE_MISMATCH", `${provider.name} does not offer ${service.name}.`)
  }
  return { provider, service }
}

async function busyBlocks(tx: Tx, providerId: string, around: Date, excludeId?: string) {
  const rows = await tx.appointment.findMany({
    where: {
      providerId,
      status: { in: BLOCKING_STATUSES },
      startTime: { lt: addMinutes(around, 48 * 60) },
      blockedUntil: { gt: addMinutes(around, -48 * 60) },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { startTime: true, blockedUntil: true, serviceId: true },
  })
  return rows
}

/** Validates compatibility, availability, lead time and conflicts. Must run inside the provider lock. */
async function placeAppointment(
  tx: Tx,
  ctx: TenantContext,
  args: { providerId: string; serviceId: string; start: Date; excludeId?: string; now?: Date },
) {
  const now = args.now ?? new Date()
  const { provider, service } = await loadBookable(tx, ctx, args.providerId, args.serviceId)

  if (args.start <= now) {
    throw badRequest("PAST_TIME", "Appointments must start in the future.", { startTime: ["Choose a future time"] })
  }

  const timing = { duration: service.duration, bufferTime: service.bufferTime, capacity: service.capacity }
  const times = computeTimes(args.start, timing)

  const windows = await tx.availability.findMany({ where: { providerId: provider.id, businessId: ctx.businessId } })
  if (!isWithinAvailability(times.startTime, times.endTime, windows, ctx.timeZone)) {
    throw conflict("OUTSIDE_AVAILABILITY", `${provider.name} is not available at that time.`)
  }

  const busy = await busyBlocks(tx, provider.id, args.start, args.excludeId)
  if (hasConflict({ ...times, serviceId: service.id }, timing, busy)) {
    throw conflict("SLOT_UNAVAILABLE", "That time slot was just taken. Please choose another time.")
  }

  return { provider, service, times }
}

export interface CreateAppointmentInput {
  clientId: string
  providerId: string
  serviceId: string
  startTime: Date
  notes?: string
  status?: "scheduled" | "confirmed"
  paymentStatus?: "paid" | "pending" | "refunded"
  channel?: "website" | "phone" | "walk-in" | "partner"
  location?: string
}

export async function createAppointment(ctx: TenantContext, input: CreateAppointmentInput, now?: Date) {
  return db.$transaction(
    async (tx) => {
      await lockProviders(tx, [input.providerId])
      const client = await tx.client.findFirst({ where: { id: input.clientId, businessId: ctx.businessId } })
      if (!client) throw badRequest("INVALID_CLIENT", "Client not found.", { clientId: ["Client not found"] })

      const { service, times } = await placeAppointment(tx, ctx, {
        providerId: input.providerId,
        serviceId: input.serviceId,
        start: input.startTime,
        now,
      })

      return tx.appointment.create({
        data: {
          businessId: ctx.businessId,
          clientId: client.id,
          providerId: input.providerId,
          serviceId: service.id,
          startTime: times.startTime,
          endTime: times.endTime,
          blockedUntil: times.blockedUntil,
          status: input.status ?? "scheduled",
          paymentStatus: input.paymentStatus ?? "pending",
          channel: channelToDb(input.channel ?? "phone"),
          notes: input.notes ?? "",
          price: service.price,
          location: input.location ?? "Main Studio",
        },
      })
    },
    { timeout: 10_000 },
  )
}

export interface UpdateAppointmentInput {
  startTime?: Date
  providerId?: string
  serviceId?: string
  status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show"
  paymentStatus?: "paid" | "pending" | "refunded"
  channel?: "website" | "phone" | "walk-in" | "partner"
  notes?: string
  location?: string
}

export async function updateAppointment(auth: AuthContext, id: string, patch: UpdateAppointmentInput, now?: Date) {
  const ctx: TenantContext = { businessId: auth.businessId, timeZone: auth.businessTimeZone }

  const preview = await db.appointment.findFirst({ where: { id, businessId: auth.businessId } })
  if (!preview) throw notFound("Appointment")
  assertProviderAccess(auth, preview.providerId)
  if (patch.providerId) assertProviderAccess(auth, patch.providerId)

  return db.$transaction(
    async (tx) => {
      await lockProviders(tx, [preview.providerId, patch.providerId ?? preview.providerId])

      const existing = await tx.appointment.findFirst({ where: { id, businessId: auth.businessId } })
      if (!existing) throw notFound("Appointment")

      const nextStatus = patch.status ? statusToDb(patch.status) : existing.status
      if (nextStatus !== existing.status && !APPOINTMENT_TRANSITIONS[statusFromDb(existing.status)].includes(statusFromDb(nextStatus))) {
        throw conflict("INVALID_TRANSITION", `A ${existing.status.replace("_", "-")} appointment cannot be changed to ${nextStatus.replace("_", "-")}.`)
      }

      const nextProviderId = patch.providerId ?? existing.providerId
      const nextServiceId = patch.serviceId ?? existing.serviceId
      const nextStart = patch.startTime ?? existing.startTime
      const timingChanged =
        nextProviderId !== existing.providerId ||
        nextServiceId !== existing.serviceId ||
        nextStart.getTime() !== existing.startTime.getTime()
      const reactivating =
        !BLOCKING_STATUSES.includes(existing.status) && BLOCKING_STATUSES.includes(nextStatus)
      const staysBlocking = BLOCKING_STATUSES.includes(nextStatus)

      if (timingChanged && !["scheduled", "confirmed"].includes(existing.status)) {
        throw conflict("NOT_RESCHEDULABLE", "Only scheduled or confirmed appointments can be rescheduled.")
      }

      const data: Prisma.AppointmentUncheckedUpdateInput = {
        status: nextStatus,
        ...(patch.paymentStatus ? { paymentStatus: patch.paymentStatus } : {}),
        ...(patch.channel ? { channel: channelToDb(patch.channel) } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
      }

      if (staysBlocking && (timingChanged || reactivating)) {
        const { service, times } = await placeAppointment(tx, ctx, {
          providerId: nextProviderId,
          serviceId: nextServiceId,
          start: nextStart,
          excludeId: existing.id,
          now,
        })
        data.providerId = nextProviderId
        data.serviceId = nextServiceId
        data.startTime = times.startTime
        data.endTime = times.endTime
        data.blockedUntil = times.blockedUntil
        if (nextServiceId !== existing.serviceId) data.price = service.price
      }

      return tx.appointment.update({ where: { id: existing.id }, data })
    },
    { timeout: 10_000 },
  )
}

export async function listSlots(
  ctx: TenantContext,
  q: { providerId: string; serviceId: string; date: string; excludeAppointmentId?: string },
  now = new Date(),
) {
  const { provider, service } = await loadBookable(db, ctx, q.providerId, q.serviceId)
  const [windows, dayStart] = [
    await db.availability.findMany({ where: { providerId: provider.id, businessId: ctx.businessId } }),
    zonedTimeToUtc(q.date, "00:00", ctx.timeZone),
  ]
  const busy = await busyBlocks(db, provider.id, dayStart, q.excludeAppointmentId)
  const slots = generateSlots({
    dateStr: q.date,
    timeZone: ctx.timeZone,
    windows,
    service: { id: service.id, duration: service.duration, bufferTime: service.bufferTime, capacity: service.capacity },
    busy,
    now,
  })
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: ctx.timeZone, hour: "numeric", minute: "2-digit" })
  return slots.map((s) => ({ startTime: s.toISOString(), label: fmt.format(s) }))
}

/** Used by the public booking flow: finds or creates the client, then books as a website booking. */
export async function createPublicBooking(
  slug: string,
  input: { serviceId: string; providerId: string; startTime: Date; name: string; email: string; phone: string; notes: string },
) {
  const business = await db.business.findUnique({ where: { slug } })
  if (!business) throw notFound("Business")
  const ctx: TenantContext = { businessId: business.id, timeZone: business.timeZone }

  const client = await db.client.upsert({
    where: { businessId_email: { businessId: business.id, email: input.email } },
    create: { businessId: business.id, name: input.name, email: input.email, phone: input.phone },
    // Never overwrite an existing client's record from an unauthenticated form.
    update: {},
  })

  const appt = await createAppointment(ctx, {
    clientId: client.id,
    providerId: input.providerId,
    serviceId: input.serviceId,
    startTime: input.startTime,
    notes: input.notes,
    channel: "website",
    location: "Main Studio",
  })
  return { appointment: appt, business }
}
