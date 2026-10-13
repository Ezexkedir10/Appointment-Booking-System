"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { FormError } from "../../../components/form-error"
import { SlotPicker } from "../../../components/slot-picker"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import { useSlots } from "../../../hooks/use-slots"
import { useSubmit } from "../../../hooks/use-submit"
import { api, ApiClientError } from "../../../lib/api-client"
import { zonedDateKey } from "../../../lib/booking-engine"
import { formatCurrency } from "../../../lib/booking-helpers"

interface Catalog {
  business: { name: string; timeZone: string }
  services: {
    id: string
    name: string
    description: string
    duration: number
    price: number
    category: string
    color: string
    providers: { id: string; name: string; role: string }[]
  }[]
}

interface Confirmation {
  id: string
  startTime: string
  timeZone: string
}

/** Public, unauthenticated booking flow: service -> provider -> date/time -> your details. */
export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState("")
  const [providerId, setProviderId] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [details, setDetails] = useState({ name: "", email: "", phone: "", notes: "" })
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const submit = useSubmit()

  useEffect(() => {
    api<Catalog>(`/api/public/${slug}`)
      .then((c) => {
        setCatalog(c)
        setDate(zonedDateKey(new Date(), c.business.timeZone))
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [slug])

  const slotState = useSlots({ providerId, serviceId, date, publicSlug: slug })
  const service = catalog?.services.find((s) => s.id === serviceId)

  if (loadError) return <Shell><p role="alert" className="text-rose-700">{loadError}</p></Shell>
  if (!catalog) return <Shell><p className="text-slate-500">Loading…</p></Shell>

  if (confirmation) {
    const when = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: confirmation.timeZone,
    }).format(new Date(confirmation.startTime))
    return (
      <Shell title={catalog.business.name}>
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">You&apos;re booked</h2>
          <p className="mt-2 text-slate-600">
            {service?.name} on {when} ({confirmation.timeZone})
          </p>
        </div>
      </Shell>
    )
  }

  const book = () =>
    submit.run(async () => {
      if (!startTime) {
        throw new ApiClientError(400, "VALIDATION_ERROR", "Pick an available time.", { startTime: ["Choose a time"] })
      }
      const res = await api<{ booking: Confirmation }>(`/api/public/${slug}/bookings`, {
        method: "POST",
        body: { serviceId, providerId, startTime, ...details },
      })
      setConfirmation(res.booking)
    })

  return (
    <Shell title={catalog.business.name}>
      <section>
        <h2 className="text-lg font-semibold text-slate-900">1. Choose a service</h2>
        {!catalog.services.length ? <p className="mt-2 text-sm text-slate-500">No services are available to book right now.</p> : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {catalog.services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setServiceId(s.id); setProviderId(""); setStartTime("") }}
              className={`rounded-[20px] border p-4 text-left transition-colors ${serviceId === s.id ? "border-[#233731] bg-[#233731]/5" : "border-[#e5d8c9] bg-[#fffaf2] hover:bg-white"}`}
            >
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="mt-1 text-sm text-slate-600">{s.description}</p>
              <p className="mt-2 text-sm text-slate-500">{s.duration} min · {formatCurrency(s.price)}</p>
            </button>
          ))}
        </div>
      </section>

      {service ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">2. Choose who you&apos;d like to see</h2>
          {!service.providers.length ? <p className="mt-2 text-sm text-slate-500">Nobody is currently taking bookings for this service.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {service.providers.map((p) => (
              <Button key={p.id} variant={providerId === p.id ? "default" : "outline"} onClick={() => { setProviderId(p.id); setStartTime("") }}>
                {p.name}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {providerId ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">3. Pick a date and time</h2>
          <p className="mt-1 text-sm text-slate-500">Times are shown in {catalog.business.timeZone}.</p>
          <Input type="date" className="mt-3 max-w-xs rounded-2xl" value={date} min={zonedDateKey(new Date(), catalog.business.timeZone)} onChange={(e) => { setDate(e.target.value); setStartTime("") }} aria-label="Date" />
          <div className="mt-3">
            <SlotPicker slots={slotState.slots} loading={slotState.loading} error={slotState.error} ready={Boolean(date)} value={startTime} onChange={setStartTime} />
          </div>
        </section>
      ) : null}

      {startTime ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">4. Your details</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input className="rounded-2xl" placeholder="Full name" aria-label="Full name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
            <Input className="rounded-2xl" type="email" placeholder="Email" aria-label="Email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
            <Input className="rounded-2xl" placeholder="Phone (optional)" aria-label="Phone" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
            <Textarea className="rounded-2xl md:col-span-2" placeholder="Anything we should know? (optional)" aria-label="Notes" value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} />
          </div>
          <FormError error={submit.error} />
          <Button className="mt-5" disabled={submit.pending} onClick={() => void book()}>
            {submit.pending ? "Booking..." : "Confirm booking"}
          </Button>
        </section>
      ) : null}
    </Shell>
  )
}

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card className="rounded-[28px] border-slate-200/80">
        <CardContent className="p-7 md:p-9">
          {title ? <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-950">Book with {title}</h1> : null}
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
