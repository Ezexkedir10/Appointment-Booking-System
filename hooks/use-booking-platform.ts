"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, ApiClientError, reviveDates } from "../lib/api-client"
import { setDisplayTimeZone } from "../lib/booking-helpers"
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

export interface SessionInfo {
  user: { id: string; name: string; email: string; role: "ADMIN" | "PROVIDER"; providerId: string | null }
  business: { id: string; name: string; slug: string; timeZone: string }
}

const empty: BookingPlatformState = { services: [], providers: [], clients: [], appointments: [], availability: [] }

const D = ["createdAt", "updatedAt"]
const reviveService = (s: Service) => reviveDates(s, D)
const reviveProvider = (p: Provider) => reviveDates(p, D)
const reviveClient = (c: Client) => reviveDates(c, D)
const reviveAppointment = (a: Appointment) => reviveDates(a, [...D, "startTime", "endTime", "blockedUntil"])

type Resource = keyof BookingPlatformState

/**
 * Server-backed replacement for the old localStorage hook. The returned data keeps the
 * same shape the pages already use; mutations are async, throw ApiClientError on failure
 * (so forms can show the server's validation messages) and refetch what they touched.
 */
export function useBookingPlatform() {
  const router = useRouter()
  const [state, setState] = useState<BookingPlatformState>(empty)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiClientError && e.status === 401) {
        router.replace("/login")
        return
      }
      setError(e instanceof Error ? e.message : "Failed to load data.")
    },
    [router],
  )

  const fetchResource = useCallback(async (resource: Resource): Promise<Partial<BookingPlatformState>> => {
    switch (resource) {
      case "services":
        return { services: (await api<{ services: Service[] }>("/api/services")).services.map(reviveService) }
      case "providers":
        return { providers: (await api<{ providers: Provider[] }>("/api/providers")).providers.map(reviveProvider) }
      case "clients":
        return { clients: (await api<{ clients: Client[] }>("/api/clients")).clients.map(reviveClient) }
      case "appointments":
        return {
          appointments: (await api<{ appointments: Appointment[] }>("/api/appointments?limit=1000")).appointments.map(
            reviveAppointment,
          ),
        }
      case "availability":
        return { availability: (await api<{ availability: Availability[] }>("/api/availability")).availability }
    }
  }, [])

  const refresh = useCallback(
    async (...resources: Resource[]) => {
      const parts = await Promise.all(resources.map(fetchResource))
      setState((current) => Object.assign({}, current, ...parts))
    },
    [fetchResource],
  )

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const me = await api<SessionInfo>("/api/auth/me")
      setSession(me)
      setDisplayTimeZone(me.business.timeZone)
      await refresh("services", "providers", "clients", "appointments", "availability")
    } catch (e) {
      handleError(e)
    } finally {
      setIsLoading(false)
    }
  }, [refresh, handleError])

  useEffect(() => {
    void reload()
  }, [reload])

  const getService = (id: string) => state.services.find((s) => s.id === id)
  const getProvider = (id: string) => state.providers.find((p) => p.id === id)
  const getClient = (id: string) => state.clients.find((c) => c.id === id)

  const createService = async (data: CreateServiceData) => {
    await api("/api/services", { method: "POST", body: data })
    await refresh("services")
  }
  const updateService = async (id: string, data: Partial<Service>) => {
    await api(`/api/services/${id}`, { method: "PATCH", body: data })
    await refresh("services")
  }
  const createProvider = async (data: CreateProviderData) => {
    await api("/api/providers", { method: "POST", body: data })
    await refresh("providers")
  }
  const updateProvider = async (id: string, data: Partial<Provider>) => {
    await api(`/api/providers/${id}`, { method: "PATCH", body: data })
    await refresh("providers")
  }
  const createClient = async (data: CreateClientData) => {
    await api("/api/clients", { method: "POST", body: data })
    await refresh("clients")
  }
  const updateClient = async (id: string, data: Partial<Client>) => {
    await api(`/api/clients/${id}`, { method: "PATCH", body: data })
    await refresh("clients")
  }
  const createAppointment = async (data: CreateAppointmentData) => {
    await api("/api/appointments", { method: "POST", body: { ...data, startTime: data.startTime.toISOString() } })
    await refresh("appointments", "clients")
  }
  /** Reschedule, reassign or edit details. Pass startTime as a Date to reschedule. */
  const updateAppointment = async (
    id: string,
    data: Partial<Pick<Appointment, "providerId" | "serviceId" | "status" | "paymentStatus" | "channel" | "notes" | "location">> & {
      startTime?: Date
    },
  ) => {
    await api(`/api/appointments/${id}`, {
      method: "PATCH",
      body: { ...data, startTime: data.startTime?.toISOString() },
    })
    await refresh("appointments")
  }
  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => updateAppointment(id, { status })
  const createAvailability = async (data: CreateAvailabilityData) => {
    await api("/api/availability", { method: "POST", body: data })
    await refresh("availability")
  }
  const deleteAvailability = async (id: string) => {
    await api(`/api/availability/${id}`, { method: "DELETE" })
    await refresh("availability")
  }
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" })
    router.replace("/login")
  }

  return {
    ...state,
    session,
    timeZone: session?.business.timeZone ?? null,
    isLoading,
    error,
    reload,
    getService,
    getProvider,
    getClient,
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
    deleteAvailability,
    logout,
  }
}
