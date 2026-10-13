# AppointIQ Studio

A full-stack appointment booking system for service businesses: an operations dashboard for admins and providers, a public customer booking page, and a PostgreSQL-backed API that enforces the booking rules on the server.

## What's in the box

- **Next.js 15 / React 18 / TypeScript / Tailwind 4**, with the original routes and visual design.
- **PostgreSQL + Prisma**: schema, migrations, seed data.
- **Authentication and roles**: cookie sessions (random token, only its SHA-256 is stored), scrypt password hashes. Roles are `ADMIN` (everything in their business) and `PROVIDER` (own appointments and availability only; read-only access to services; sees only clients they're booked with).
- **Multi-tenant scoping**: every table carries a `businessId` and every query filters on it, so one business can never read or change another's data.
- **Server-side booking rules** (`lib/booking-engine.ts`, `lib/server/booking-service.ts`):
  - provider must offer the service (the provider's "specialties");
  - appointment must fall inside one of the provider's availability windows;
  - `endTime = start + duration`, `blockedUntil = endTime + buffer`; the buffer blocks other bookings but may run past the end of a window;
  - no overlapping bookings per provider. Services with `capacity > 1` may share an identical start time up to their capacity;
  - bookings are serialised per provider with a transaction-scoped PostgreSQL advisory lock, so simultaneous attempts for the same slot produce exactly one winner and a `409 SLOT_UNAVAILABLE` for the rest;
  - status transitions are validated (`lib/appointment-rules.ts`); reschedules and re-opening a cancelled booking re-run every check.
- **Time zones**: timestamps are stored in UTC. Each business has an IANA `timeZone`; availability windows are wall-clock times in that zone, slot generation and all displayed times use it, and DST transitions are handled.
- **Public booking flow** at `/book/<business-slug>` (no login): service → provider → date/time → details. Rate-limited.
- **Frontend**: pages load from the API with loading, error (retry) and empty states; forms show the server's validation messages; the booking form picks from live open slots; appointments can be rescheduled, edited, confirmed, completed, cancelled or marked no-show.

## Local setup

Requires Node 20+ and PostgreSQL 14+ (a `docker-compose.yml` is included).

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env             # then edit values
docker compose up -d db          # optional: local Postgres on :5432
npm run db:migrate -- --name init   # first time: creates and applies the initial migration
npm run db:seed                  # demo business, data and logins
npm run dev                      # http://localhost:3000
```

The baseline migration is committed under `prisma/migrations`. For a new local database, run `npm run db:deploy` before seeding. When the schema changes during development, create a new migration with `npm run db:migrate -- --name describe_change`; commit the generated migration directory. In production, run `npm run db:deploy` as part of deployment.

Seeded logins (password = `SEED_ADMIN_PASSWORD`, default `ChangeMe123!` outside production; seeding in production refuses to run without it):

| Email | Role |
| --- | --- |
| `admin@appointiq.io` | Admin |
| `amina@appointiq.io` | Provider (Amina Rahman) |

Public booking page for the demo business: `/book/appointiq-studio`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `TEST_DATABASE_URL` | for tests | Separate database for integration tests |
| `SEED_ADMIN_PASSWORD` | prod seed | Password for seeded users |
| `SEED_TIME_ZONE` | no | Business time zone for the seed (default `America/New_York`) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next config). Build also runs type-check and lint; they are no longer disabled. |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply committed migrations (production) |
| `npm run db:seed` | Seed demo data (replaces the demo business) |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run test:unit` | Pure tests (booking engine, time zones, validation); no database needed |
| `npm test` | Everything; DB and HTTP suites are skipped unless configured (below) |

## Testing

- `tests/unit` — booking engine (time zones incl. DST, buffers, overlaps, capacity, slot generation) and request validation.
- `tests/integration/booking.test.ts` — against real PostgreSQL: end-time/buffer math stored in UTC, overlap and buffer conflicts, availability, provider/service mismatch, **concurrent booking of one slot (exactly one wins)**, cancel/reschedule/reopen, status transitions, group capacity, tenant isolation, provider-role restrictions. Runs when `TEST_DATABASE_URL` is set (apply migrations to it first: `DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy`). Each test creates its own isolated business and cleans up after itself.
- `tests/integration/api.test.ts` — HTTP level: 401s, bad credentials, validation field errors, cross-origin rejection, role restrictions, the public booking flow and double-booking via the public API. Runs when `TEST_BASE_URL` points at a running app using a seeded database.

## API overview

All routes return JSON; errors look like `{ "error": { "code", "message", "fieldErrors?" } }` with 400 (validation), 401, 403, 404, 409 (conflicts such as `SLOT_UNAVAILABLE`, `OUTSIDE_AVAILABILITY`, `PROVIDER_SERVICE_MISMATCH`, `INVALID_TRANSITION`) or 429.

| Route | Methods | Access |
| --- | --- | --- |
| `/api/auth/login`, `/logout`, `/me` | POST, POST, GET | public / session |
| `/api/business` | PATCH | admin |
| `/api/services`, `/api/services/:id` | GET, POST / PATCH, DELETE | read: any user; write: admin |
| `/api/providers`, `/api/providers/:id` | GET, POST / PATCH | read: admin (all) or provider (self); write: admin |
| `/api/clients`, `/api/clients/:id` | GET, POST / PATCH, DELETE | any user create/read (providers see their own clients); edit/delete: admin |
| `/api/availability`, `/api/availability/:id` | GET, POST / PATCH, DELETE | admin, or provider for their own windows |
| `/api/appointments`, `/api/appointments/:id` | GET, POST / PATCH | admin, or provider for their own |
| `/api/slots?providerId&serviceId&date` | GET | session |
| `/api/public/:slug`, `/slots`, `/bookings` | GET, GET, POST | public, rate-limited |

Mutating requests carrying an `Origin` header must match the host (CSRF defence in addition to `SameSite=Lax` cookies).

## Optional: database-level double-booking backstop

The advisory lock already prevents double bookings. `prisma/sql/appointment_no_overlap.sql` adds a PostgreSQL exclusion constraint as a second layer (instructions inside). Skip it if you use service `capacity > 1`.

## Known limitations / next steps

- The login rate limiter and public-endpoint limiter are in-memory (per instance); use Redis/Upstash when running several instances.
- No email/SMS confirmations or payment processing yet (payment status is a manual field).
- Registration/invite flow for new businesses and providers is not built; create users via the seed or SQL for now.
- Availability windows can be created, edited and deleted via the API; the UI currently supports creating them.
- No pagination in the UI (the appointments API caps at 1000 rows per request).
