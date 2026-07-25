// Simple in-memory data store for development
// This can be easily replaced with actual database calls later

import type {
  Service,
  Provider,
  Client,
  Appointment,
  Availability,
  CreateServiceData,
  CreateClientData,
  CreateAppointmentData,
  CreateProviderData,
  CreateAvailabilityData,
  TimeSlot,
} from "./types"
import { mockServices, mockProviders, mockClients, mockAppointments, mockAvailability } from "./mock-data"

class DataStore {
  private services: Service[] = [...mockServices]
  private providers: Provider[] = [...mockProviders]
  private clients: Client[] = [...mockClients]
  private appointments: Appointment[] = [...mockAppointments]
  private availability: Availability[] = [...mockAvailability]

  // Services
  getServices(): Service[] {
    return this.services.filter((s) => s.isActive)
  }

  getServiceById(id: string): Service | undefined {
    return this.services.find((s) => s.id === id)
  }

  createService(data: CreateServiceData): Service {
    const service: Service = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
      category: data.category || "General",
      color: data.color || "#2563eb",
      bufferTime: data.bufferTime ?? 10,
      capacity: data.capacity ?? 1,
      isActive: true,
      featured: data.featured ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.services.push(service)
    return service
  }

  updateService(id: string, data: Partial<CreateServiceData>): Service | null {
    const index = this.services.findIndex((s) => s.id === id)
    if (index === -1) return null

    this.services[index] = {
      ...this.services[index],
      ...data,
      updatedAt: new Date(),
    }
    return this.services[index]
  }

  deleteService(id: string): boolean {
    const index = this.services.findIndex((s) => s.id === id)
    if (index === -1) return false

    this.services[index].isActive = false
    this.services[index].updatedAt = new Date()
    return true
  }

  // Providers
  getProviders(): Provider[] {
    return this.providers.filter((p) => p.isActive)
  }

  getProviderById(id: string): Provider | undefined {
    return this.providers.find((p) => p.id === id)
  }

  getProvidersForService(serviceId: string): Provider[] {
    return this.providers.filter((p) => p.isActive && p.specialties.includes(serviceId))
  }

  createProvider(data: CreateProviderData): Provider {
    const provider: Provider = {
      id: Date.now().toString(),
      name: data.name,
      role: data.role || "Provider",
      email: data.email,
      phone: data.phone || "",
      bio: data.bio || "",
      specialties: data.specialties,
      rating: data.rating ?? 4.7,
      utilizationTarget: data.utilizationTarget ?? 75,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.providers.push(provider)
    return provider
  }

  updateProvider(id: string, data: Partial<CreateProviderData>): Provider | null {
    const index = this.providers.findIndex((p) => p.id === id)
    if (index === -1) return null

    this.providers[index] = {
      ...this.providers[index],
      ...data,
      updatedAt: new Date(),
    }
    return this.providers[index]
  }

  deleteProvider(id: string): boolean {
    const index = this.providers.findIndex((p) => p.id === id)
    if (index === -1) return false

    this.providers[index].isActive = false
    this.providers[index].updatedAt = new Date()
    return true
  }

  // Clients
  getClients(): Client[] {
    return this.clients
  }

  getClientById(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id)
  }

  createClient(data: CreateClientData): Client {
    const client: Client = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      notes: data.notes || "",
      segment: data.segment || "new",
      preferredContact: data.preferredContact || "email",
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.clients.push(client)
    return client
  }

  updateClient(id: string, data: Partial<CreateClientData>): Client | null {
    const index = this.clients.findIndex((c) => c.id === id)
    if (index === -1) return null

    this.clients[index] = {
      ...this.clients[index],
      ...data,
      updatedAt: new Date(),
    }
    return this.clients[index]
  }

  deleteClient(id: string): boolean {
    const index = this.clients.findIndex((c) => c.id === id)
    if (index === -1) return false

    this.clients.splice(index, 1)
    return true
  }

  // Appointments
  getAppointments(): Appointment[] {
    return this.appointments
  }

  getAppointmentById(id: string): Appointment | undefined {
    return this.appointments.find((a) => a.id === id)
  }

  getAppointmentsByDate(date: Date): Appointment[] {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return this.appointments.filter((a) => a.startTime >= startOfDay && a.startTime <= endOfDay)
  }

  getAppointmentsByProvider(providerId: string): Appointment[] {
    return this.appointments.filter((a) => a.providerId === providerId)
  }

  createAppointment(data: CreateAppointmentData): Appointment {
    const service = this.getServiceById(data.serviceId)
    if (!service) throw new Error("Service not found")

    const endTime = new Date(data.startTime)
    endTime.setMinutes(endTime.getMinutes() + service.duration)

    const appointment: Appointment = {
      id: Date.now().toString(),
      clientId: data.clientId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      startTime: data.startTime,
      endTime,
      status: data.status || "scheduled",
      paymentStatus: data.paymentStatus || "pending",
      channel: data.channel || "website",
      notes: data.notes || "",
      price: service.price,
      location: data.location || "Main Studio",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.appointments.push(appointment)
    return appointment
  }

  updateAppointmentStatus(id: string, status: Appointment["status"]): Appointment | null {
    const index = this.appointments.findIndex((a) => a.id === id)
    if (index === -1) return null

    this.appointments[index].status = status
    this.appointments[index].updatedAt = new Date()
    return this.appointments[index]
  }

  // Availability
  getAllAvailability(): Availability[] {
    return this.availability
  }

  getProviderAvailability(providerId: string): Availability[] {
    return this.availability.filter((a) => a.providerId === providerId && a.isActive)
  }

  createAvailability(data: CreateAvailabilityData): Availability {
    const availability: Availability = {
      id: Date.now().toString(),
      ...data,
    }
    this.availability.push(availability)
    return availability
  }

  updateAvailability(id: string, data: Partial<CreateAvailabilityData>): Availability | null {
    const index = this.availability.findIndex((a) => a.id === id)
    if (index === -1) return null

    this.availability[index] = {
      ...this.availability[index],
      ...data,
    }
    return this.availability[index]
  }

  deleteAvailability(id: string): boolean {
    const index = this.availability.findIndex((a) => a.id === id)
    if (index === -1) return false

    this.availability.splice(index, 1)
    return true
  }

  getAvailableTimeSlots(providerId: string, date: Date, serviceDuration: number): TimeSlot[] {
    const dayOfWeek = date.getDay()
    const providerAvailability = this.getProviderAvailability(providerId).filter((a) => a.dayOfWeek === dayOfWeek)

    if (providerAvailability.length === 0) {
      return []
    }

    const slots: TimeSlot[] = []
    const existingAppointments = this.getAppointmentsByProvider(providerId).filter((apt) =>
      this.isSameDay(apt.startTime, date),
    )

    for (const availability of providerAvailability) {
      const startMinutes = this.timeStringToMinutes(availability.startTime)
      const endMinutes = this.timeStringToMinutes(availability.endTime)

      for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += 30) {
        const slotStart = new Date(date)
        slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)

        // Check if this slot conflicts with existing appointments
        const hasConflict = existingAppointments.some((apt) => {
          return (
            (slotStart >= apt.startTime && slotStart < apt.endTime) ||
            (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
            (slotStart <= apt.startTime && slotEnd >= apt.endTime)
          )
        })

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: !hasConflict,
          providerId,
        })
      }
    }

    return slots
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString()
  }

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }
}

// Export singleton instance
export const dataStore = new DataStore()
