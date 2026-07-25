"use client"

import { useEffect, useState } from "react"
import { addMinutes } from "../lib/utils/date-utils"
import { mockAppointments, mockAvailability, mockClients, mockProviders, mockServices } from "../lib/mock-data"
import type {
  Appointment,
  AppointmentStatus,
  Availability,
  BookingPlatformState,
  Client,
  CreateAppointmentData,
  CreateAvailabilityData,
  CreateClientData,
  CreateProviderData,
  CreateServiceData,
  Provider,
  Service,
} from "../lib/types"

const STORAGE_KEY = "appointiq-platform-state-v2"

const initialState = (): BookingPlatformState => ({
  services: mockServices,
  providers: mockProviders,
  clients: mockClients,
  appointments: mockAppointments,
  availability: mockAvailability,
})

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value))

const reviveState = (rawState: BookingPlatformState): BookingPlatformState => ({
  services: rawState.services.map((service) => ({
    ...service,
    createdAt: toDate(service.createdAt),
    updatedAt: toDate(service.updatedAt),
  })),
  providers: rawState.providers.map((provider) => ({
    ...provider,
    createdAt: toDate(provider.createdAt),
    updatedAt: toDate(provider.updatedAt),
  })),
  clients: rawState.clients.map((client) => ({
    ...client,
    createdAt: toDate(client.createdAt),
    updatedAt: toDate(client.updatedAt),
  })),
  appointments: rawState.appointments.map((appointment) => ({
    ...appointment,
    startTime: toDate(appointment.startTime),
    endTime: toDate(appointment.endTime),
    createdAt: toDate(appointment.createdAt),
    updatedAt: toDate(appointment.updatedAt),
  })),
  availability: rawState.availability,
})

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`

export function useBookingPlatform() {
  const [state, setState] = useState<BookingPlatformState>(initialState)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (saved) {
      try {
        setState(reviveState(JSON.parse(saved) as BookingPlatformState))
      } catch {
        setState(initialState())
      }
    }

    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isHydrated, state])

  const getService = (serviceId: string) => state.services.find((service) => service.id === serviceId)
  const getProvider = (providerId: string) => state.providers.find((provider) => provider.id === providerId)
  const getClient = (clientId: string) => state.clients.find((client) => client.id === clientId)

  const createService = (data: CreateServiceData) => {
    const next: Service = {
      id: createId("srv"),
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

    setState((current) => ({ ...current, services: [next, ...current.services] }))
  }

  const updateService = (serviceId: string, data: Partial<Service>) => {
    setState((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId ? { ...service, ...data, updatedAt: new Date() } : service,
      ),
    }))
  }

  const createProvider = (data: CreateProviderData) => {
    const next: Provider = {
      id: createId("pro"),
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

    setState((current) => ({ ...current, providers: [next, ...current.providers] }))
  }

  const updateProvider = (providerId: string, data: Partial<Provider>) => {
    setState((current) => ({
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === providerId ? { ...provider, ...data, updatedAt: new Date() } : provider,
      ),
    }))
  }

  const createClient = (data: CreateClientData) => {
    const next: Client = {
      id: createId("cli"),
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

    setState((current) => ({ ...current, clients: [next, ...current.clients] }))
  }

  const updateClient = (clientId: string, data: Partial<Client>) => {
    setState((current) => ({
      ...current,
      clients: current.clients.map((client) =>
        client.id === clientId ? { ...client, ...data, updatedAt: new Date() } : client,
      ),
    }))
  }

  const createAppointment = (data: CreateAppointmentData) => {
    const service = getService(data.serviceId)
    if (!service) {
      return
    }

    const next: Appointment = {
      id: createId("apt"),
      clientId: data.clientId,
      providerId: data.providerId,
      serviceId: data.serviceId,
      startTime: data.startTime,
      endTime: addMinutes(data.startTime, service.duration + service.bufferTime),
      status: data.status || "scheduled",
      paymentStatus: data.paymentStatus || "pending",
      channel: data.channel || "website",
      notes: data.notes || "",
      price: service.price,
      location: data.location || "Main Studio",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setState((current) => ({ ...current, appointments: [next, ...current.appointments] }))
  }

  const updateAppointment = (appointmentId: string, data: Partial<Appointment>) => {
    setState((current) => ({
      ...current,
      appointments: current.appointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, ...data, updatedAt: new Date() } : appointment,
      ),
    }))
  }

  const updateAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    updateAppointment(appointmentId, { status })
  }

  const createAvailability = (data: CreateAvailabilityData) => {
    const next: Availability = {
      id: createId("av"),
      providerId: data.providerId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: data.isActive,
    }

    setState((current) => ({ ...current, availability: [next, ...current.availability] }))
  }

  const resetDemo = () => {
    setState(initialState())
  }

  return {
    ...state,
    isHydrated,
    createService,
    updateService,
    createProvider,
    updateProvider,
    createClient,
    updateClient,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    createAvailability,
    resetDemo,
  }
}
