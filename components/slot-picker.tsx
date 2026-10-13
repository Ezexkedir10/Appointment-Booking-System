"use client"

import type { SlotOption } from "../hooks/use-slots"

interface Props {
  slots: SlotOption[]
  loading: boolean
  error: string | null
  ready: boolean
  value: string
  onChange: (startTime: string) => void
}

/** Grid of available start times, with distinct "pick details first", loading, error and "none free" states. */
export function SlotPicker({ slots, loading, error, ready, value, onChange }: Props) {
  if (!ready) return <p className="text-sm text-slate-500">Choose a service, provider and date to see open times.</p>
  if (loading) return <p className="text-sm text-slate-500">Checking availability…</p>
  if (error) return <p className="text-sm text-rose-700">{error}</p>
  if (!slots.length) {
    return <p className="text-sm text-slate-500">No open times that day. Try another date or provider.</p>
  }
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Available times">
      {slots.map((slot) => (
        <button
          key={slot.startTime}
          type="button"
          role="radio"
          aria-checked={value === slot.startTime}
          onClick={() => onChange(slot.startTime)}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
            value === slot.startTime
              ? "border-[#233731] bg-[#233731] text-[#f6f1e9]"
              : "border-[#e5d8c9] bg-[#fffaf2] text-slate-700 hover:border-[#cdb79a] hover:bg-white"
          }`}
        >
          {slot.label}
        </button>
      ))}
    </div>
  )
}
