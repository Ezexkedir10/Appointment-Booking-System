"use client"

import { useEffect, useState } from "react"
import { api } from "../lib/api-client"

export interface SlotOption {
  startTime: string
  label: string
}

/** Loads bookable start times for provider + service + business-local date (re-fetches on change). */
export function useSlots(params: {
  providerId?: string
  serviceId?: string
  date?: string
  excludeAppointmentId?: string
  publicSlug?: string
}) {
  const { providerId, serviceId, date, excludeAppointmentId, publicSlug } = params
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!providerId || !serviceId || !date) {
      setSlots([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({ providerId, serviceId, date })
    if (excludeAppointmentId) qs.set("excludeAppointmentId", excludeAppointmentId)
    const url = publicSlug ? `/api/public/${publicSlug}/slots?${qs}` : `/api/slots?${qs}`
    api<{ slots: SlotOption[] }>(url)
      .then((res) => !cancelled && setSlots(res.slots))
      .catch((e: Error) => {
        if (!cancelled) {
          setSlots([])
          setError(e.message)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [providerId, serviceId, date, excludeAppointmentId, publicSlug])

  return { slots, loading, error }
}
