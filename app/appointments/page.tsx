"use client"

import { useState } from "react"
import { CalendarClock, Filter, Plus } from "lucide-react"
import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import { formatCurrency, formatDateTime, getStatusTone } from "../../lib/booking-helpers"
import type { AppointmentStatus } from "../../lib/types"

const statusOptions: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no-show"]

export default function AppointmentsPage() {
  const { appointments, clients, createAppointment, providers, services, updateAppointmentStatus } = useBookingPlatform()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({
    clientId: "",
    providerId: "",
    serviceId: "",
    startTime: "2026-07-25T10:00",
    channel: "website",
    location: "Main Studio",
    notes: "",
  })

  const filteredAppointments = appointments
    .filter((appointment) => (statusFilter === "all" ? true : appointment.status === statusFilter))
    .filter((appointment) => {
      const client = clients.find((item) => item.id === appointment.clientId)
      const provider = providers.find((item) => item.id === appointment.providerId)
      const service = services.find((item) => item.id === appointment.serviceId)
      const haystack = [client?.name, provider?.name, service?.name, appointment.location].join(" ").toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return (
    <AppShell
      eyebrow="Booking Operations"
      title="Coordinate the live appointment pipeline"
      subtitle="This screen moves beyond basic booking CRUD by tracking booking channels, payment state, service value, staff assignment, and status progression across the appointment lifecycle."
      actions={
        <Badge className="rounded-full bg-emerald-100 px-4 py-2 text-emerald-800">
          {appointments.filter((appointment) => appointment.status !== "cancelled").length} active bookings
        </Badge>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-800">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Create booking</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Add a new appointment</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Client</label>
                <Select value={form.clientId} onValueChange={(value) => setForm((current) => ({ ...current, clientId: value }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Choose client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Provider</label>
                <Select
                  value={form.providerId}
                  onValueChange={(value) => setForm((current) => ({ ...current, providerId: value }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Assign provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Service</label>
                <Select value={form.serviceId} onValueChange={(value) => setForm((current) => ({ ...current, serviceId: value }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Start time</label>
                <Input
                  className="rounded-2xl"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Booking channel</label>
                <Select value={form.channel} onValueChange={(value) => setForm((current) => ({ ...current, channel: value }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Location</label>
                <Input
                  className="rounded-2xl"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea
                  className="min-h-28 rounded-2xl"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>

            <Button
              className="mt-5"
              onClick={() => {
                if (!form.clientId || !form.providerId || !form.serviceId || !form.startTime) {
                  return
                }

                createAppointment({
                  clientId: form.clientId,
                  providerId: form.providerId,
                  serviceId: form.serviceId,
                  startTime: new Date(form.startTime),
                  channel: form.channel as "website" | "phone" | "walk-in" | "partner",
                  location: form.location,
                  notes: form.notes,
                })

                setForm({
                  clientId: "",
                  providerId: "",
                  serviceId: "",
                  startTime: "2026-07-25T10:00",
                  channel: "website",
                  location: "Main Studio",
                  notes: "",
                })
              }}
            >
              Create booking
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Live queue</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">All appointments</h3>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="rounded-full pl-9"
                    placeholder="Search client, provider, service..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full rounded-full md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {filteredAppointments.map((appointment) => {
                const client = clients.find((item) => item.id === appointment.clientId)
                const provider = providers.find((item) => item.id === appointment.providerId)
                const service = services.find((item) => item.id === appointment.serviceId)

                return (
                  <div key={appointment.id} className="rounded-[24px] border border-[#eadfcf] bg-[#fffaf4] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-slate-900">{service?.name}</h4>
                          <Badge className={`rounded-full border px-3 py-1 ${getStatusTone(appointment.status)}`}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {client?.name} with {provider?.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(appointment.startTime)}</p>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3 lg:text-right">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Channel</p>
                          <p className="mt-1 font-medium text-slate-800">{appointment.channel}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Value</p>
                          <p className="mt-1 font-medium text-slate-800">{formatCurrency(appointment.price)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Location</p>
                          <p className="mt-1 font-medium text-slate-800">{appointment.location}</p>
                        </div>
                      </div>
                    </div>

                    {appointment.notes ? <p className="mt-4 text-sm leading-7 text-slate-600">{appointment.notes}</p> : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          variant={appointment.status === status ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => updateAppointmentStatus(appointment.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {!filteredAppointments.length ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 p-10 text-center text-slate-500">
                  <CalendarClock className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm">No appointments match the current filter.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
