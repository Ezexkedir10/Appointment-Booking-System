import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { ZodError, type ZodTypeAny, type z } from "zod"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message)
  }
}

export const unauthorized = () => new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.")
export const forbidden = (msg = "You do not have permission to do that.") => new ApiError(403, "FORBIDDEN", msg)
export const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found.`)
export const conflict = (code: string, msg: string) => new ApiError(409, code, msg)
export const badRequest = (code: string, msg: string, fieldErrors?: Record<string, string[] | undefined>) =>
  new ApiError(400, code, msg, fieldErrors)

type RouteContext = { params: Promise<Record<string, string>> }
type RouteFn = (req: NextRequest, ctx: RouteContext) => Promise<unknown>

/** Block cross-site mutations: if an Origin header is sent it must match this host. */
function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return
  const origin = req.headers.get("origin")
  if (!origin) return
  const host = req.headers.get("host")
  if (!host || new URL(origin).host !== host) {
    throw new ApiError(403, "BAD_ORIGIN", "Cross-origin requests are not allowed.")
  }
}

/** Wraps a route handler: same-origin check, JSON serialization, uniform error shape. */
export function route(fn: RouteFn) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      assertSameOrigin(req)
      const result = await fn(req, ctx)
      if (result instanceof Response) return result
      return NextResponse.json(result ?? { ok: true })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields.", fieldErrors: error.flatten().fieldErrors } },
      { status: 400 },
    )
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: { code: "DUPLICATE", message: "A record with those details already exists." } }, { status: 409 })
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Record not found." } }, { status: 404 })
    }
    if (error.code === "P2003") {
      return NextResponse.json({ error: { code: "IN_USE", message: "This record is referenced by other data and cannot be removed." } }, { status: 409 })
    }
  }
  console.error("Unhandled API error", error)
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 })
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw badRequest("INVALID_JSON", "Request body must be valid JSON.")
  }
  return schema.parse(json)
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()))
}
