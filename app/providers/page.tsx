"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { FormError } from "../../components/form-error"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { useSubmit } from "../../hooks/use-submit"
import { api } from "../../lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const submit = useSubmit()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const signIn = () =>
    submit.run(async () => {
      await api("/api/auth/login", { method: "POST", body: { email, password } })
      router.replace("/")
    })

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-[28px] border-slate-200/80">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] ink-panel">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">AppointIQ Studio</p>
              <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
            </div>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void signIn()
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
              <Input id="email" type="email" autoComplete="username" required className="rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
              <Input id="password" type="password" autoComplete="current-password" required className="rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <FormError error={submit.error} />
            <Button type="submit" className="w-full" disabled={submit.pending}>
              {submit.pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
