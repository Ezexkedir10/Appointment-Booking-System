"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { CalendarClock, ChartColumn, Clock3, Home, Sparkles, Users, UserSquare2, Wrench } from "lucide-react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"

const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/dashboard", label: "Control Room", icon: ChartColumn },
  { href: "/appointments", label: "Bookings", icon: CalendarClock },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/providers", label: "Team", icon: UserSquare2 },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/availability", label: "Capacity", icon: Clock3 },
]

interface AppShellProps {
  title: string
  subtitle: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, eyebrow, actions, children }: AppShellProps) {
  const pathname = usePathname()
  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? "Workspace"

  return (
    <div className="min-h-screen text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-6">
        <header className="glass-panel soft-outline rounded-[32px] border border-white/80 px-5 py-5 md:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] ink-panel shadow-[0_16px_30px_rgba(35,55,49,0.18)]">
                <Sparkles className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Appointment Platform</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">AppointIQ Studio</h1>
                <p className="mt-1 text-sm text-slate-600">A redesigned booking workspace for services, staff, clients, and analytics.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Live workspace</Badge>
              <Badge className="bg-[#233731] text-[#f6f1e9]">Saturday, July 25, 2026</Badge>
              <Button asChild>
                <Link href="/appointments">Open Bookings</Link>
              </Button>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "border-[#233731] bg-[#233731] text-[#f6f1e9] shadow-[0_12px_24px_rgba(35,55,49,0.18)]"
                      : "border-[#e5d8c9] bg-[#fffaf2] text-slate-700 hover:border-[#cdb79a] hover:bg-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.45fr]">
          <section className="glass-panel soft-outline rounded-[34px] border border-white/80 p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.65fr] lg:items-start">
              <div>
                {eyebrow ? <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">{eyebrow}</p> : null}
                <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{title}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{subtitle}</p>
              </div>

              <div className="warm-panel rounded-[28px] border border-[#eadfcf] p-5 shadow-[0_18px_40px_rgba(109,84,49,0.08)]">
                <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Current section</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{activeLabel}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Every page now follows the same new structure: editorial header, high-contrast controls, and warm premium surfaces.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {actions}
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-6">
            <div className="ink-panel rounded-[32px] border border-white/10 p-6 shadow-[0_24px_45px_rgba(35,55,49,0.22)]">
              <p className="section-label text-[11px] font-semibold uppercase text-[#d8c7a8]">Design system</p>
              <p className="mt-3 text-2xl font-semibold">Warm editorial UI</p>
              <p className="mt-3 text-sm leading-7 text-[#ddd3c4]">
                Dark ink accents, soft paper surfaces, clear contrast, and consistent navigation hierarchy.
              </p>
            </div>

            <div className="paper-grid rounded-[32px] border border-[#eadfcf] bg-[#fffaf2] p-6 shadow-[0_18px_40px_rgba(109,84,49,0.06)]">
              <p className="section-label text-[11px] font-semibold uppercase text-[#8a6b41]">Consistency</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <li>Readable text over every background</li>
                <li>One navigation language across all pages</li>
                <li>Same component rhythm for forms and data cards</li>
              </ul>
            </div>
          </aside>
        </div>

        <main className="mt-6">
          <div className="glass-panel soft-outline rounded-[34px] border border-white/80 p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
