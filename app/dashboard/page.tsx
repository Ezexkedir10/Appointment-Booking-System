"use client"

import { AppShell } from "../../components/app-shell"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { useBookingPlatform } from "../../hooks/use-booking-platform"
import {
  dayNames,
  formatCompactDate,
  formatCurrency,
  formatDateTime,
  getRevenue,
  getTodayAppointments,
  getUpcomingAppointments,
  getWeeklyUtilization,
} from "../../lib/booking-helpers"

export default function DashboardPage() {
  const { appointments, availability, clients, providers, services } = useBookingPlatform()
  const totalRevenue = getRevenue(appointments)
  const upcoming = getUpcomingAppointments(appointments).slice(0, 5)
  const todayAppointments = getTodayAppointments(appointments)
  const confirmed = appointments.filter((appointment) => appointment.status === "confirmed").length
  const completed = appointments.filter((appointment) => appointment.status === "completed").length
  const pendingPayments = appointments
    .filter((appointment) => appointment.paymentStatus === "pending")
    .reduce((sum, appointment) => sum + appointment.price, 0)

  const clientMix = [
    { label: "VIP", count: clients.filter((client) => client.segment === "vip").length, tone: "bg-rose-500" },
    { label: "Returning", count: clients.filter((client) => client.segment === "returning").length, tone: "bg-teal-500" },
    { label: "New", count: clients.filter((client) => client.segment === "new").length, tone: "bg-sky-500" },
    { label: "At risk", count: clients.filter((client) => client.segment === "at-risk").length, tone: "bg-amber-500" },
  ]

  return (
    <AppShell
      eyebrow="Control Room"
      title="Business intelligence for the booking operation"
      subtitle="A stronger dashboard gives the project credibility: daily scheduling flow, provider workload, segment mix, payment risk, and revenue movement are all visible from one screen."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Completed revenue", value: formatCurrency(totalRevenue), note: "Paid and completed appointments" },
          { label: "Appointments today", value: todayAppointments.length.toString(), note: "Live operating schedule for Saturday, July 25, 2026" },
          { label: "Confirmed bookings", value: confirmed.toString(), note: "Ready for delivery with low drop risk" },
          { label: "Pending payments", value: formatCurrency(pendingPayments), note: "Follow-up value still not captured" },
        ].map((item) => (
          <Card key={item.label} className="rounded-[24px] border-slate-200/80">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Live queue</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Upcoming appointments</h3>
              </div>
              <Badge className="bg-[#233731] text-[#f6f1e9]">{upcoming.length} next visits</Badge>
            </div>

            <div className="mt-6 space-y-4">
              {upcoming.map((appointment) => {
                const client = clients.find((item) => item.id === appointment.clientId)
                const provider = providers.find((item) => item.id === appointment.providerId)
                const service = services.find((item) => item.id === appointment.serviceId)

                return (
                  <div key={appointment.id} className="rounded-[24px] border border-[#eadfcf] bg-[#fffaf4] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">{service?.name}</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {client?.name} with {provider?.name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
                        <p className="mt-1 font-medium text-slate-800">{formatDateTime(appointment.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Location</p>
                        <p className="mt-1 font-medium text-slate-800">{appointment.location}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Value</p>
                        <p className="mt-1 font-medium text-slate-800">{formatCurrency(appointment.price)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[28px] border-slate-200/80">
            <CardContent className="p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Performance</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Provider utilization</h3>
              <div className="mt-6 space-y-5">
                {providers.map((provider) => {
                  const utilization = getWeeklyUtilization(provider, availability, appointments)

                  return (
                    <div key={provider.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{provider.name}</p>
                          <p className="text-sm text-slate-500">{provider.role}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{utilization}%</span>
                      </div>
                      <Progress value={utilization} className="h-2.5" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200/80">
            <CardContent className="p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Client mix</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Retention segments</h3>
              <div className="mt-6 space-y-4">
                {clientMix.map((segment) => (
                  <div key={segment.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{segment.label}</span>
                      <span className="text-slate-500">{segment.count} clients</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${segment.tone}`}
                        style={{ width: `${clients.length ? (segment.count / clients.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Schedule footprint</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Provider operating windows</h3>
            <div className="mt-6 space-y-4">
              {providers.map((provider) => {
                const windows = availability.filter((slot) => slot.providerId === provider.id && slot.isActive)
                return (
                  <div key={provider.id} className="rounded-[24px] bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">{provider.name}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {windows.map((slot) => (
                        <Badge key={slot.id} variant="secondary" className="rounded-full px-3 py-1">
                          {dayNames[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200/80">
          <CardContent className="p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Conversion notes</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Recent completed work</h3>
              </div>
              <Badge className="rounded-full bg-emerald-100 text-emerald-800">{completed} completed</Badge>
            </div>
            <div className="mt-6 space-y-4">
              {appointments
                .filter((appointment) => appointment.status === "completed")
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                .slice(0, 4)
                .map((appointment) => {
                  const client = clients.find((item) => item.id === appointment.clientId)
                  const service = services.find((item) => item.id === appointment.serviceId)
                  return (
                    <div key={appointment.id} className="rounded-[24px] border border-slate-200/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{client?.name}</p>
                          <p className="text-sm text-slate-500">{service?.name}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{formatCurrency(appointment.price)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{appointment.notes}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        Finished on {formatCompactDate(appointment.startTime)}
                      </p>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
