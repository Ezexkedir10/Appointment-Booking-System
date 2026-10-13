import type { ApiClientError } from "../lib/api-client"

const labelFor = (field: string) => field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())

export function FormError({ error }: { error: ApiClientError | null }) {
  if (!error) return null
  const fields = Object.entries(error.fieldErrors ?? {}).filter(([, msgs]) => msgs?.length)
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="font-medium">{error.message}</p>
      {fields.length ? (
        <ul className="mt-1 list-disc pl-5">
          {fields.map(([field, msgs]) => (
            <li key={field}>
              {labelFor(field)}: {msgs?.join(", ")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
