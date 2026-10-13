import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../lib/server/auth-hash"
import { computeTimes, zonedTimeToUtc } from "../lib/booking-engine"
import { channelToDb, segmentToDb, statusToDb } from "../lib/server/serializers"
import { mockAppointments, mockAvailability, mockClients, mockProviders, mockServices } from "./seed-data"

const prisma = new PrismaClient()

const BUSINESS_SLUG = "appointiq-studio"
const TIME_ZONE = process.env.SEED_TIME_ZONE ?? "America/New_York"

/** Mock dates are naive wall-clock values; read their components rather than their instant. */
const parts = (d: Date) => ({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), hh: d.getHours(), mm: d.getMinutes() })
const pad = (n: number) => String(n).padStart(2, "0")

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("Set SEED_ADMIN_PASSWORD before seeding in production.")
  }
  const adminPassword = password ?? "ChangeMe123!"

  // Re-seeding replaces the demo business; everything hangs off it via ON DELETE CASCADE.
  await prisma.business.deleteMany({ where: { slug: BUSINESS_SLUG } })
  const business = await prisma.business.create({
    data: { name: "AppointIQ Studio", slug: BUSINESS_SLUG, timeZone: TIME_ZONE },
  })

  await prisma.service.createMany({
    data: mockServices.map((s) => ({
      id: s.id, businessId: business.id, name: s.name, description: s.description, duration: s.duration,
      price: s.price, category: s.category, color: s.color, bufferTime: s.bufferTime, capacity: s.capacity,
      isActive: s.isActive, featured: s.featured,
    })),
  })

  for (const p of mockProviders) {
    await prisma.provider.create({
      data: {
        id: p.id, businessId: business.id, name: p.name, role: p.role, email: p.email, phone: p.phone, bio: p.bio,
        rating: p.rating, utilizationTarget: p.utilizationTarget, isActive: p.isActive,
        services: { create: p.specialties.map((serviceId) => ({ serviceId })) },
      },
    })
  }

  await prisma.client.createMany({
    data: mockClients.map((c) => ({
      id: c.id, businessId: business.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes,
      segment: segmentToDb(c.segment), preferredContact: c.preferredContact, tags: c.tags,
    })),
  })

  await prisma.availability.createMany({
    data: mockAvailability.map((a) => ({
      id: a.id, businessId: business.id, providerId: a.providerId, dayOfWeek: a.dayOfWeek,
      startTime: a.startTime, endTime: a.endTime, isActive: a.isActive,
    })),
  })

  // Shift the sample appointments by whole weeks (so weekdays are preserved) to land around "now".
  const now = new Date()
  const earliest = Math.min(...mockAppointments.map((a) => a.startTime.getTime()))
  const weeks = Math.ceil((now.getTime() - 14 * 86_400_000 - earliest) / (7 * 86_400_000))
  const servicesById = new Map(mockServices.map((s) => [s.id, s]))

  for (const a of mockAppointments) {
    const service = servicesById.get(a.serviceId)!
    const p = parts(a.startTime)
    const shifted = new Date(Date.UTC(p.y, p.m, p.d + weeks * 7))
    const dateStr = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
    const start = zonedTimeToUtc(dateStr, `${pad(p.hh)}:${pad(p.mm)}`, TIME_ZONE)
    const t = computeTimes(start, service)
    const past = start < now
    const status = past && (a.status === "scheduled" || a.status === "confirmed") ? "completed" : a.status
    await prisma.appointment.create({
      data: {
        id: a.id, businessId: business.id, clientId: a.clientId, providerId: a.providerId, serviceId: a.serviceId,
        startTime: t.startTime, endTime: t.endTime, blockedUntil: t.blockedUntil,
        status: statusToDb(status), paymentStatus: a.paymentStatus, channel: channelToDb(a.channel),
        notes: a.notes, price: a.price, location: a.location,
      },
    })
  }

  await prisma.user.create({
    data: {
      businessId: business.id, email: "admin@appointiq.io", name: "Studio Admin",
      passwordHash: await hashPassword(adminPassword), role: "ADMIN",
    },
  })
  // A provider-role login so role-based access can be tried out: sees only Amina's bookings.
  await prisma.user.create({
    data: {
      businessId: business.id, email: "amina@appointiq.io", name: "Amina Rahman",
      passwordHash: await hashPassword(adminPassword), role: "PROVIDER", providerId: "pro-1",
    },
  })

  console.log(`Seeded "${business.name}" (${TIME_ZONE}). Public booking page: /book/${BUSINESS_SLUG}`)
  console.log("Logins: admin@appointiq.io (admin), amina@appointiq.io (provider)")
  if (!password) console.log("Password: ChangeMe123!  (development default - set SEED_ADMIN_PASSWORD to override)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
