"use client"

import { useCallback, useState } from "react"
import { ApiClientError } from "../lib/api-client"

/** Runs a form action, tracking pending state and surfacing server validation errors. */
export function useSubmit() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiClientError | null>(null)

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setPending(true)
    setError(null)
    try {
      await action()
      return true
    } catch (e) {
      setError(e instanceof ApiClientError ? e : new ApiClientError(0, "ERROR", "Something went wrong."))
      return false
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error, clear: () => setError(null) }
}
