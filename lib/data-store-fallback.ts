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

class LocalStorageDataStore {
  private services: Service[] = []
  private providers: Provider[] = []
  private clients: Client[] = []
  private appointments: Appointment[] = []
  private availability: Availability[] = []
  private isInitialized = false

  constructor() {
    // Data will be loaded lazily when first accessed
  }

  private ensureInitialized(): void {
    if (this.isInitialized) return

    this.services = [...mockServices]
    this.providers = [...mockProviders]
    this.clients = [...mockClients]
    this.appointments = [...mockAppointments]
    this.availability = [...mockAvailability]

    if (typeof window !== "undefined") {
      this.loadFromStorage()
    }

    this.isInitialized = true
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("appointment-booking-data")
      if (stored) {
        const data = JSON.parse(stored)
        this.services = data.services?.map(this.deserializeService) || [...mockServices]
        this.providers = data.providers?.map(this.deserializeProvider) || [...mockProviders]
        this.clients = data.clients?.map(this.deserializeClient) || [...mockClients]
        this.appointments = data.appointments?.map(this.deserializeAppointment) || [...mockAppointments]
        this.availability = data.availability || [...mockAvailability]
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return

    try {
      const data = {
        services: this.services,
        providers: this.providers,
        clients: this.clients,
        appointments: this.appointments,
        availability: this.availability,
      }
      localStorage.setItem("appointment-booking-data", JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save data to localStorage:", error)
    }
  }

  private deserializeService(service: any): Service {
    return {
      ...service,
      createdAt: new Date(service.createdAt),
      updatedAt: new Date(service.updatedAt),
    }
  }

  private deserializeProvider(provider: any): Provider {
    return {
      ...provider,
      createdAt: new Date(provider.createdAt),
      updatedAt: new Date(provider.updatedAt),
    }
  }

  private deserializeClient(client: any): Client {
    return {
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
    }
  }

  private deserializeAppointment(appointment: any): Appointment {
    return {
      ...appointment,
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      createdAt: new Date(appointment.createdAt),
      updatedAt: new Date(appointment.updatedAt),
    }
  }

  // Services - Convert async methods to sync for localStorage
  async getServices(): Promise<Service[]> {
    this.ensureInitialized()
    return this.services.filter((s) => s.isActive)
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    this.ensureInitialized()
    return this.services.find((s) => s.id === id)
  }

  async createService(data: CreateServiceData): Promise<Service> {
    this.ensureInitialized()
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
    this.saveToStorage()
    return service
  }

  async updateService(id: string, data: Partial<CreateServiceData>): Promise<Service | null> {
    this.ensureInitialized()
    const index = this.services.findIndex((s) => s.id === id)
    if (index === -1) return null

    this.services[index] = {
      ...this.services[index],
      ...data,
      updatedAt: new Date(),
    }
    this.saveToStorage()
    return this.services[index]
  }

  async deleteService(id: string): Promise<boolean> {
    this.ensureInitialized()
    const index = this.services.findIndex((s) => s.id === id)
    if (index === -1) return false

    this.services[index].isActive = false
    this.services[index].updatedAt = new Date()
    this.saveToStorage()
    return true
  }

  // Providers
  async getProviders(): Promise<Provider[]> {
    this.ensureInitialized()
    return this.providers.filter((p) => p.isActive)
  }

  async getProviderById(id: string): Promise<Provider | undefined> {
    this.ensureInitialized()
    return this.providers.find((p) => p.id === id)
  }

  async getProvidersForService(serviceId: string): Promise<Provider[]> {
    this.ensureInitialized()
    return this.providers.filter((p) => p.isActive && p.specialties.includes(serviceId))
  }

  async createProvider(data: CreateProviderData): Promise<Provider> {
    this.ensureInitialized()
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
    this.saveToStorage()
    return provider
  }

  async updateProvider(id: string, data: Partial<CreateProviderData>): Promise<Provider | null> {
    this.ensureInitialized()
    const index = this.providers.findIndex((p) => p.id === id)
    if (index === -1) return null

    this.providers[index] = {
      ...this.providers[index],
      ...data,
      updatedAt: new Date(),
    }
    this.saveToStorage()
    return this.providers[index]
  }

  async deleteProvider(id: string): Promise<boolean> {
    this.ensureInitialized()
    const index = this.providers.findIndex((p) => p.id === id)
    if (index === -1) return false

    this.providers[index].isActive = false
    this.providers[index].updatedAt = new Date()
    this.saveToStorage()
    return true
  }

  // Clients
  async getClients(): Promise<Client[]> {
    this.ensureInitialized()
    return this.clients
  }

  async getClientById(id: string): Promise<Client | undefined> {
    this.ensureInitialized()
    return this.clients.find((c) => c.id === id)
  }

  async createClient(data: CreateClientData): Promise<Client> {
    this.ensureInitialized()
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
    this.saveToStorage()
    return client
  }

  async updateClient(id: string, data: Partial<CreateClientData>): Promise<Client | null> {
    this.ensureInitialized()
    const index = this.clients.findIndex((c) => c.id === id)
    if (index === -1) return null

    this.clients[index] = {
      ...this.clients[index],
      ...data,
      updatedAt: new Date(),
    }
    this.saveToStorage()
    return this.clients[index]
  }

  async deleteClient(id: string): Promise<boolean> {
    this.ensureInitialized()
    const index = this.clients.findIndex((c) => c.id === id)
    if (index === -1) return false

    this.clients.splice(index, 1)
    this.saveToStorage()
    return true
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    this.ensureInitialized()
    return this.appointments
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    this.ensureInitialized()
    return this.appointments.find((a) => a.id === id)
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    this.ensureInitialized()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return this.appointments.filter((a) => a.startTime >= startOfDay && a.startTime <= endOfDay)
  }

  async getAppointmentsByProvider(providerId: string): Promise<Appointment[]> {
    this.ensureInitialized()
    return this.appointments.filter((a) => a.providerId === providerId)
  }

  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    this.ensureInitialized()
    const service = await this.getServiceById(data.serviceId)
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
    this.saveToStorage()
    return appointment
  }

  async updateAppointmentStatus(id: string, status: Appointment["status"]): Promise<Appointment | null> {
    this.ensureInitialized()
    const index = this.appointments.findIndex((a) => a.id === id)
    if (index === -1) return null

    this.appointments[index].status = status
    this.appointments[index].updatedAt = new Date()
    this.saveToStorage()
    return this.appointments[index]
  }

  // Availability
  async getAllAvailability(): Promise<Availability[]> {
    this.ensureInitialized()
    return this.availability
  }

  async getProviderAvailability(providerId: string): Promise<Availability[]> {
    this.ensureInitialized()
    return this.availability.filter((a) => a.providerId === providerId && a.isActive)
  }

  async createAvailability(data: CreateAvailabilityData): Promise<Availability> {
    this.ensureInitialized()
    const availability: Availability = {
      id: Date.now().toString(),
      ...data,
      isActive: true,
    }
    this.availability.push(availability)
    this.saveToStorage()
    return availability
  }

  async updateAvailability(id: string, data: Partial<CreateAvailabilityData>): Promise<Availability | null> {
    this.ensureInitialized()
    const index = this.availability.findIndex((a) => a.id === id)
    if (index === -1) return null

    this.availability[index] = {
      ...this.availability[index],
      ...data,
    }
    this.saveToStorage()
    return this.availability[index]
  }

  async deleteAvailability(id: string): Promise<boolean> {
    this.ensureInitialized()
    const index = this.availability.findIndex((a) => a.id === id)
    if (index === -1) return false

    this.availability.splice(index, 1)
    this.saveToStorage()
    return true
  }
  
  async resetToMockData(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("appointment-booking-data")
    }

    this.services = [...mockServices]
    this.providers = [...mockProviders]
    this.clients = [...mockClients]
    this.appointments = [...mockAppointments]
    this.availability = [...mockAvailability]
    this.isInitialized = true

    this.saveToStorage()
  }

  async clearAllData(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("appointment-booking-data")
    }

    this.services = []
    this.providers = []
    this.clients = []
    this.appointments = []
    this.availability = []
    this.isInitialized = true
  }

  async getAvailableTimeSlots(providerId: string, date: Date, serviceDuration: number): Promise<TimeSlot[]> {
    const dayOfWeek = date.getDay()
    const providerAvailability = await this.getProviderAvailability(providerId)
    const dayAvailability = providerAvailability.filter((a) => a.dayOfWeek === dayOfWeek)

    if (dayAvailability.length === 0) {
      return []
    }

    const slots: TimeSlot[] = []
    const existingAppointments = await this.getAppointmentsByProvider(providerId)
    const dayAppointments = existingAppointments.filter((apt) => this.isSameDay(apt.startTime, date))

    for (const availability of dayAvailability) {
      const startMinutes = this.timeStringToMinutes(availability.startTime)
      const endMinutes = this.timeStringToMinutes(availability.endTime)

      for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += 30) {
        const slotStart = new Date(date)
        slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)

        const hasConflict = dayAppointments.some((apt) => {
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


export const localStorageDataStore = new LocalStorageDataStore()

