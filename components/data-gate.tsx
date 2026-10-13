"use client"

import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "./ui/button"

interface Props {
  platform: { isLoading: boolean; error: string | null; reload: () => void }
  children: ReactNode
}

/** Shows a skeleton while loading and a retry panel if the first load fails. */
export function DataGate({ platform, children }: Props) {
  if (platform.isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-2" aria-busy="true" aria-label="Loading workspace">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-[28px] border border-slate-200/80 bg-white/60" />
        ))}
      </div>
    )
  }
  if (platform.error) {
    return (
      <div role="alert" className="rounded-[28px] border border-rose-200 bg-rose-50 p-10 text-center text-rose-900">
        <AlertTriangle className="mx-auto h-8 w-8" />
        <p className="mt-3 font-medium">{platform.error}</p>
        <Button className="mt-4" variant="outline" onClick={platform.reload}>
          Try again
        </Button>
      </div>
    )
  }
  return <>{children}</>
}

export function EmptyState({ icon, message }: { icon?: ReactNode; message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 p-10 text-center text-slate-500">
      {icon}
      <p className="mt-3 text-sm">{message}</p>
    </div>
  )
}
