"use client"

import { useState } from "react"
import { Clock3, Plus } from "lucide-react"
import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import { dayNames, getWeeklyUtilization } from "../../lib/booking-helpers"

export default function AvailabilityPage() {
  const { appointments, availability, createAvailability, providers } = useBookingPlatform()
  const [form, setForm] = useState({
    providerId: providers[0]?.id || "",
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "17:00",
  })

  return (
    <AppShell
      eyebrow="Capacity Planning"
      title="Visualize operating hours and provider capacity"
      subtitle="Availability now supports a more operational scheduling story by connecting provider windows to utilization, booking density, and weekly footprint planning."
      actions={
        <Badge className="rounded-full bg-sky-100 px-4 py-2 text-sky-800">{availability.length} active schedule windows</Badge>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Add schedule</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Create a provider window</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Provider</label>
                <Select
                  value={form.providerId}
                  onValueChange={(value) => setForm((current) => ({ ...current, providerId: value }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
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
                <label className="text-sm font-medium text-slate-700">Day</label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(value) => setForm((current) => ({ ...current, dayOfWeek: value }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, index) => (
                      <SelectItem key={day} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Start</label>
                  <Input
                    className="rounded-2xl"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">End</label>
                  <Input
                    className="rounded-2xl"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Button
              className="mt-5"
              onClick={() => {
                if (!form.providerId) return
                createAvailability({
                  providerId: form.providerId,
                  dayOfWeek: Number(form.dayOfWeek),
                  startTime: form.startTime,
                  endTime: form.endTime,
                  isActive: true,
                })
              }}
            >
              Save window
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[28px] border-slate-200/80">
            <CardContent className="p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Weekly map</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Provider schedule grid</h3>
              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.5fr_repeat(7,minmax(0,1fr))] gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Provider</div>
                    {dayNames.map((day) => (
                      <div key={day} className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 space-y-3">
                    {providers.map((provider) => (
                      <div key={provider.id} className="grid grid-cols-[1.5fr_repeat(7,minmax(0,1fr))] gap-3 text-sm">
                        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4">
                          <p className="font-semibold text-slate-900">{provider.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{provider.role}</p>
                        </div>

                        {dayNames.map((day, index) => {
                          const slots = availability.filter(
                            (slot) => slot.providerId === provider.id && slot.dayOfWeek === index && slot.isActive,
                          )
                          return (
                            <div key={`${provider.id}-${day}`} className="rounded-2xl bg-slate-50 px-3 py-3">
                              {slots.length ? (
                                <div className="space-y-2">
                                  {slots.map((slot) => (
                                    <div key={slot.id} className="rounded-xl bg-white px-3 py-2 text-slate-700 shadow-sm">
                                      {slot.startTime}-{slot.endTime}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 py-5 text-slate-400">
                                  Off
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            {providers.map((provider) => {
              const utilization = getWeeklyUtilization(provider, availability, appointments)
              return (
                <Card key={provider.id} className="rounded-[28px] border-slate-200/80">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">{provider.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{provider.role}</p>
                      </div>
                      <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                        <Clock3 className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Weekly utilization</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{utilization}%</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {availability
                        .filter((slot) => slot.providerId === provider.id && slot.isActive)
                        .map((slot) => (
                          <Badge key={slot.id} variant="secondary" className="rounded-full px-3 py-1">
                            {dayNames[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
