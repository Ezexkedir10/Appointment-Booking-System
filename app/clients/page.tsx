"use client"

import { useState } from "react"
import { HeartHandshake, Plus } from "lucide-react"
import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import { formatCompactDate, formatCurrency, getClientStats } from "../../lib/booking-helpers"

export default function ClientsPage() {
  const { appointments, clients, createClient } = useBookingPlatform()
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    segment: "new",
    preferredContact: "email",
    notes: "",
    tags: "",
  })

  return (
    <AppShell
      eyebrow="Client Relationships"
      title="Track clients like an actual growth-minded business"
      subtitle="Instead of only storing contact details, the client area now supports segments, contact preference, tags, visit history, and lifetime value so the appointment system reads like a real retention product."
      actions={
        <Badge className="rounded-full bg-rose-100 px-4 py-2 text-rose-800">
          {clients.filter((client) => client.segment === "vip").length} VIP accounts
        </Badge>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Add client</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Capture a new relationship</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Full name</label>
                <Input
                  className="rounded-2xl"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  className="rounded-2xl"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input
                  className="rounded-2xl"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Segment</label>
                <Select value={form.segment} onValueChange={(value) => setForm((current) => ({ ...current, segment: value }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="returning">Returning</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="at-risk">At risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Preferred contact</label>
                <Select
                  value={form.preferredContact}
                  onValueChange={(value) => setForm((current) => ({ ...current, preferredContact: value }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Tags</label>
                <Input
                  className="rounded-2xl"
                  placeholder="vip, premium, partner-lead"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
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
                if (!form.name || !form.email) return

                createClient({
                  name: form.name,
                  email: form.email,
                  phone: form.phone,
                  segment: form.segment as "vip" | "returning" | "new" | "at-risk",
                  preferredContact: form.preferredContact as "email" | "phone" | "sms",
                  notes: form.notes,
                  tags: form.tags
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })

                setForm({
                  name: "",
                  email: "",
                  phone: "",
                  segment: "new",
                  preferredContact: "email",
                  notes: "",
                  tags: "",
                })
              }}
            >
              Save client
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {clients.map((client) => {
            const stats = getClientStats(client, appointments)

            return (
              <Card key={client.id} className="rounded-[28px] border-slate-200/80">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{client.name}</h3>
                        <Badge className="rounded-full bg-slate-100 text-slate-700">{client.segment}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{client.email}</p>
                      <p className="text-sm text-slate-500">{client.phone}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lifetime value</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(stats.lifetimeValue)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Visits</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{stats.totalAppointments}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Preferred contact:</span> {client.preferredContact}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Last completed visit:</span>{" "}
                      {stats.lastVisit ? formatCompactDate(stats.lastVisit) : "No completed visits yet"}
                    </p>
                    <p className="leading-7">{client.notes}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
