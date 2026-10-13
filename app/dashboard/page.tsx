"use client"

import { useState } from "react"
import { Star, UserPlus } from "lucide-react"
import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { DataGate, EmptyState } from "../../components/data-gate"
import { FormError } from "../../components/form-error"
import { ApiClientError } from "../../lib/api-client"
import { useSubmit } from "../../hooks/use-submit"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import { formatCurrency, getProviderStats, getWeeklyUtilization } from "../../lib/booking-helpers"

export default function ProvidersPage() {
  const platform = useBookingPlatform()
  const { appointments, availability, createProvider, providers, services } = platform
  const submit = useSubmit()
  const [form, setForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    bio: "",
    specialties: "",
  })

  return (
    <AppShell
      session={platform.session}
      onLogout={platform.logout}
      eyebrow="Team Operations"
      title="Manage providers, specialties, and workload"
      subtitle="The provider area now shows a more realistic operations view: role definition, quality score, utilization, earned revenue, and skill alignment with the service catalog."
      actions={
        <Badge className="rounded-full bg-amber-100 px-4 py-2 text-amber-800">
          Avg rating {(providers.reduce((sum, provider) => sum + provider.rating, 0) / providers.length).toFixed(1)}
        </Badge>
      }
    >
      <DataGate platform={platform}>
      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Add provider</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Expand the team roster</h3>
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
                <label className="text-sm font-medium text-slate-700">Role</label>
                <Input
                  className="rounded-2xl"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
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
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  className="rounded-2xl"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Specialties</label>
                <Input
                  className="rounded-2xl"
                  placeholder="Executive Consultation, Signature Care Package"
                  value={form.specialties}
                  onChange={(event) => setForm((current) => ({ ...current, specialties: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Bio</label>
                <Textarea
                  className="min-h-28 rounded-2xl"
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </div>
            </div>

            <FormError error={submit.error} />
            <Button
              className="mt-5"
              disabled={submit.pending}
              onClick={() =>
                submit.run(async () => {
                const names = form.specialties
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                const matched = names.map((name) => ({
                  name,
                  id: services.find((service) => service.name.toLowerCase() === name.toLowerCase())?.id,
                }))
                const unknown = matched.filter((m) => !m.id).map((m) => m.name)
                if (unknown.length) {
                  throw new ApiClientError(400, "VALIDATION_ERROR", "Some specialties don't match a service.", {
                    specialties: [`Unknown service: ${unknown.join(", ")}`],
                  })
                }
                const specialties = matched.map((m) => m.id as string)

                await createProvider({
                  name: form.name,
                  role: form.role || "Provider",
                  email: form.email,
                  phone: form.phone,
                  bio: form.bio,
                  specialties,
                })

                setForm({ name: "", role: "", email: "", phone: "", bio: "", specialties: "" })
                })
              }
            >
              {submit.pending ? "Saving..." : "Save provider"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {!providers.length ? (
            <div className="md:col-span-2">
              <EmptyState message="No team members yet. Add your first provider above." />
            </div>
          ) : null}
          {providers.map((provider) => {
            const stats = getProviderStats(provider, appointments)
            const utilization = getWeeklyUtilization(provider, availability, appointments)

            return (
              <Card key={provider.id} className="rounded-[28px] border-slate-200/80">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">{provider.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{provider.role}</p>
                      <p className="mt-2 text-sm text-slate-500">{provider.email}</p>
                      <p className="text-sm text-slate-500">{provider.phone}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                      <Star className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">{provider.bio}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Utilization</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{utilization}%</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Revenue</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(stats.revenue)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rating</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{provider.rating.toFixed(1)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bookings</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{stats.activeBookings}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.specialties.map((specialty) => {
                      const service = services.find((item) => item.id === specialty)
                      return (
                        <Badge key={specialty} variant="secondary" className="rounded-full px-3 py-1">
                          {service?.name || specialty}
                        </Badge>
                      )
                    })}
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
