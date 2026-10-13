export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    })
  } catch {
    throw new ApiClientError(0, "NETWORK", "Can't reach the server. Check your connection and try again.")
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const e = json?.error
    throw new ApiClientError(res.status, e?.code ?? "ERROR", e?.message ?? "Something went wrong.", e?.fieldErrors)
  }
  return json as T
}

/** JSON dates arrive as ISO strings; the UI works with Date objects. */
export const reviveDates = <T extends object>(row: T, keys: string[]): T => {
  const copy = { ...row } as Record<string, unknown>
  for (const k of keys) if (typeof copy[k] === "string") copy[k] = new Date(copy[k] as string)
  return copy as T
}
