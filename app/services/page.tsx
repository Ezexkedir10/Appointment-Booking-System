"use client"

import { useState } from "react"
import { Layers3, Sparkles } from "lucide-react"
import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { DataGate, EmptyState } from "../../components/data-gate"
import { FormError } from "../../components/form-error"
import { useSubmit } from "../../hooks/use-submit"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import { formatCurrency, getServiceBookingCount } from "../../lib/booking-helpers"

export default function ServicesPage() {
  const platform = useBookingPlatform()
  const { appointments, createService, services } = platform
  const submit = useSubmit()
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    duration: "60",
    price: "100",
    bufferTime: "10",
    capacity: "1",
    color: "#0f766e",
  })

  return (
    <AppShell
      session={platform.session}
      onLogout={platform.logout}
      eyebrow="Service Design"
      title="Build a service catalog that feels premium and operationally smart"
      subtitle="Each service now carries richer metadata such as categories, buffer time, featured placement, color identity, and capacity planning so the project looks more like a real booking product."
    >
      <DataGate platform={platform}>
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-800">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Create service</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Add a new offering</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Service name</label>
                <Input
                  className="rounded-2xl"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <Input
                  className="rounded-2xl"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Brand color</label>
                <Input
                  className="rounded-2xl"
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <Input
                  className="rounded-2xl"
                  type="number"
                  value={form.duration}
                  onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Price</label>
                <Input
                  className="rounded-2xl"
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Buffer time</label>
                <Input
                  className="rounded-2xl"
                  type="number"
                  value={form.bufferTime}
                  onChange={(event) => setForm((current) => ({ ...current, bufferTime: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Capacity</label>
                <Input
                  className="rounded-2xl"
                  type="number"
                  value={form.capacity}
                  onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <Textarea
                  className="min-h-28 rounded-2xl"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
            </div>

            <FormError error={submit.error} />
            <Button
              className="mt-5"
              disabled={submit.pending}
              onClick={() =>
                submit.run(async () => {

                await createService({
                  name: form.name,
                  description: form.description,
                  category: form.category || "General",
                  duration: Number(form.duration),
                  price: Number(form.price),
                  bufferTime: Number(form.bufferTime),
                  capacity: Number(form.capacity),
                  color: form.color,
                  featured: Number(form.price) >= 150,
                })

                setForm({
                  name: "",
                  category: "",
                  description: "",
                  duration: "60",
                  price: "100",
                  bufferTime: "10",
                  capacity: "1",
                  color: "#0f766e",
                })
                })
              }
            >
              {submit.pending ? "Saving..." : "Add service"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {!services.length ? (
            <div className="md:col-span-2">
              <EmptyState message="No services yet. Add your first service above." />
            </div>
          ) : null}
          {services.map((service) => {
            const bookingCount = getServiceBookingCount(service, appointments)

            return (
              <Card key={service.id} className="rounded-[28px] border-slate-200/80">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-4 w-4 rounded-full" style={{ backgroundColor: service.color }} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-slate-950">{service.name}</h3>
                          {service.featured ? (
                            <Badge className="rounded-full bg-teal-100 text-teal-800">Featured</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{service.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {service.category}
                    </Badge>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(service.price)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Duration</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{service.duration} min</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Buffer</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{service.bufferTime} min</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bookings</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{bookingCount}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/80 px-4 py-3 text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-teal-700" />
                      Capacity {service.capacity}
                    </span>
                    <span>{service.isActive ? "Active in catalog" : "Inactive"}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      </DataGate>
    </AppShell>
  )
}
