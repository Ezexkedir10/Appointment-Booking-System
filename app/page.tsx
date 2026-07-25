"use client"

import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, CalendarClock, ChartColumn, CircleDollarSign, ShieldCheck, Users, UserSquare2 } from "lucide-react"
import { AppShell } from "../components/app-shell"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { useBookingPlatform } from "../hooks/use-booking-platform"
import { formatCompactDate, formatCurrency, getRevenue, getUpcomingAppointments } from "../lib/booking-helpers"

export default function HomePage() {
  const { appointments, clients, providers, services, isHydrated } = useBookingPlatform()
  const upcoming = getUpcomingAppointments(appointments).slice(0, 4)
  const revenue = getRevenue(appointments)

  return (
    <AppShell
      eyebrow="Platform Overview"
      title="A completely redesigned appointment booking workspace with stronger product structure"
      subtitle="This version moves away from the earlier sidebar-heavy starter layout and into a clearer editorial workspace with better readability, calmer surfaces, stronger contrast, and more polished page consistency."
      actions={
        <Button asChild>
          <Link href="/dashboard">Review Control Room</Link>
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="ink-panel rounded-[30px] border border-white/10 p-8 shadow-[0_28px_50px_rgba(35,55,49,0.2)]">
          <Badge className="bg-white/10 text-[#f6f1e9]">System Snapshot</Badge>
          <h3 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            One booking product for services, clients, providers, schedules, and revenue visibility.
          </h3>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-[#ddd3c4] md:text-base">
            The interface is now designed to feel more like a real product case study: structured navigation,
            better contrast, stronger spacing, and cleaner content hierarchy across every page.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="section-label text-[11px] font-semibold uppercase text-[#d8c7a8]">Revenue</p>
              <p className="mt-3 text-3xl font-semibold">{formatCurrency(revenue)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="section-label text-[11px] font-semibold uppercase text-[#d8c7a8]">Clients</p>
              <p className="mt-3 text-3xl font-semibold">{clients.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="section-label text-[11px] font-semibold uppercase text-[#d8c7a8]">Providers</p>
              <p className="mt-3 text-3xl font-semibold">{providers.length}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <Card className="warm-panel rounded-[30px] border-[#eadfcf]">
            <CardContent className="p-7">
              <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Why it feels better</p>
              <div className="mt-5 space-y-4">
                {[
                  "The old structure was replaced with a top navigation shell and cleaner page framing.",
                  "The color palette is now controlled for readability instead of layered with conflicting glows.",
                  "The same spacing, control styling, and section rhythm are used throughout the app.",
                ].map((item) => (
                  <div key={item} className="rounded-[20px] border border-[#eadfcf] bg-[#fffaf4] p-4 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#eadfcf]">
            <CardContent className="p-7">
              <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Workspace status</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Badge variant="secondary">{isHydrated ? "Local data active" : "Loading workspace"}</Badge>
                <Badge variant="secondary">{services.length} services loaded</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The current interface direction is now consistent with the rest of the system and ready to keep evolving page by page.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Booking control",
            body: "Track booking status, value, channels, and location from one clearer flow.",
            href: "/appointments",
            icon: CalendarClock,
          },
          {
            title: "Business analytics",
            body: "See provider utilization, revenue signals, and client segment distribution.",
            href: "/dashboard",
            icon: ChartColumn,
          },
          {
            title: "Service operations",
            body: "Curate offerings, assign staff specialties, and shape scheduling capacity.",
            href: "/services",
            icon: CircleDollarSign,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="rounded-[28px] border-[#eadfcf]">
              <CardContent className="p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#233731] text-[#f6f1e9]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                <Button asChild variant="ghost" className="mt-5 px-0">
                  <Link href={item.href}>
                    Open section
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[30px] border-[#eadfcf]">
          <CardContent className="p-7">
            <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Platform foundations</p>
            <div className="mt-5 grid gap-4">
              {[
                { label: "Client CRM", icon: Users },
                { label: "Provider ops", icon: UserSquare2 },
                { label: "Business view", icon: BriefcaseBusiness },
                { label: "Clean delivery", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center gap-4 rounded-[22px] border border-[#eadfcf] bg-[#fffaf4] p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#efe5d6] text-[#233731]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium text-slate-800">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-[#eadfcf]">
          <CardContent className="p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Upcoming bookings</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Next scheduled appointments</h3>
              </div>
              <Badge variant="secondary">{upcoming.length} queued</Badge>
            </div>

            <div className="mt-6 grid gap-4">
              {upcoming.map((appointment) => {
                const service = services.find((item) => item.id === appointment.serviceId)
                const client = clients.find((item) => item.id === appointment.clientId)
                const provider = providers.find((item) => item.id === appointment.providerId)

                return (
                  <div key={appointment.id} className="rounded-[24px] border border-[#eadfcf] bg-[#fffaf4] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{service?.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {client?.name} with {provider?.name}
                        </p>
                      </div>
                      <Badge variant="secondary">{appointment.channel}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span>{formatCompactDate(appointment.startTime)}</span>
                      <span>{appointment.location}</span>
                      <span>{formatCurrency(appointment.price)}</span>
                    </div>
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
