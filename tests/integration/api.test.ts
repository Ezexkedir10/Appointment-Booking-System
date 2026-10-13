/**
 * HTTP-level tests: authentication, authorization, validation and the public booking flow.
 * They need a running app pointed at a seeded database:
 *
 *   DATABASE_URL=$TEST_DATABASE_URL npm run db:seed && DATABASE_URL=$TEST_DATABASE_URL npm run dev
 *   TEST_BASE_URL=http://localhost:3000 SEED_ADMIN_PASSWORD=<same as seed> npm test
 *
 * Skipped when TEST_BASE_URL is not set.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

const BASE = process.env.TEST_BASE_URL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!"
const suite = BASE ? describe : describe.skip

async function login(email: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  assert.equal(res.status, 200, `login failed for ${email}`)
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
  return (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
    fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", Cookie: cookie, ...init.headers },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
}

suite("HTTP API", () => {
  it("rejects unauthenticated requests", async () => {
    for (const path of ["/api/services", "/api/clients", "/api/appointments", "/api/providers", "/api/availability"]) {
      assert.equal((await fetch(`${BASE}${path}`)).status, 401, path)
    }
  })

  it("rejects bad credentials without revealing which part was wrong", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@appointiq.io", password: "wrong" }),
    })
    assert.equal(res.status, 401)
    assert.equal((await res.json()).error.code, "INVALID_CREDENTIALS")
  })

  it("returns field-level validation errors", async () => {
    const admin = await login("admin@appointiq.io")
    const res = await admin("/api/clients", { method: "POST", body: { name: "", email: "nope" } })
    assert.equal(res.status, 400)
    const { error } = await res.json()
    assert.equal(error.code, "VALIDATION_ERROR")
    assert.ok(error.fieldErrors.name && error.fieldErrors.email)
  })

  it("rejects availability windows that end before they start", async () => {
    const admin = await login("admin@appointiq.io")
    const res = await admin("/api/availability", { method: "POST", body: { providerId: "pro-1", dayOfWeek: 1, startTime: "17:00", endTime: "09:00" } })
    assert.equal(res.status, 400)
  })

  it("blocks cross-origin mutations", async () => {
    const admin = await login("admin@appointiq.io")
    const res = await admin("/api/clients", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: { name: "X", email: "x@example.com" },
    })
    assert.equal(res.status, 403)
  })

  it("scopes provider users to their own data and forbids admin actions", async () => {
    const amina = await login("amina@appointiq.io")
    const { appointments } = await (await amina("/api/appointments")).json()
    assert.ok(appointments.length > 0)
    assert.ok(appointments.every((a: { providerId: string }) => a.providerId === "pro-1"))
    const { providers } = await (await amina("/api/providers")).json()
    assert.deepEqual(providers.map((p: { id: string }) => p.id), ["pro-1"])
    assert.equal((await amina("/api/services", { method: "POST", body: { name: "X", duration: 30, price: 1 } })).status, 403)
    assert.equal((await amina("/api/business", { method: "PATCH", body: { timeZone: "UTC" } })).status, 403)
    assert.equal((await amina("/api/availability", { method: "POST", body: { providerId: "pro-2", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" } })).status, 403)
  })

  it("serves the public catalog and refuses double booking through the public flow", async () => {
    const catalog = await (await fetch(`${BASE}/api/public/appointiq-studio`)).json()
    assert.ok(catalog.services.length > 0)
    const svc = catalog.services.find((s: { providers: unknown[] }) => s.providers.length)
    const providerId = svc.providers[0].id
    // find a free slot over the next two weeks
    let slot: string | undefined
    for (let i = 1; i < 15 && !slot; i++) {
      const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10)
      const res = await (await fetch(`${BASE}/api/public/appointiq-studio/slots?providerId=${providerId}&serviceId=${svc.id}&date=${date}`)).json()
      slot = res.slots[0]?.startTime
    }
    assert.ok(slot, "expected at least one open slot in the next two weeks")
    const body = { serviceId: svc.id, providerId, startTime: slot, name: "Pat", email: `pat-${Date.now()}@example.com` }
    const post = () => fetch(`${BASE}/api/public/appointiq-studio/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    assert.equal((await post()).status, 201)
    const second = await post()
    assert.equal(second.status, 409)
    assert.equal((await second.json()).error.code, "SLOT_UNAVAILABLE")
  })
})
