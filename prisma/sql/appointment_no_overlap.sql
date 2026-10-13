-- Optional database-level backstop against double booking.
-- The application already serialises bookings per provider with an advisory lock;
-- this constraint makes overlapping active appointments impossible even if some
-- other code path writes to the table.
--
-- Apply as a custom migration:
--   npx prisma migrate dev --create-only --name appointment_no_overlap
--   (paste this file's contents into the generated migration.sql)
--   npx prisma migrate dev
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "providerId" WITH =,
    tstzrange("startTime", "blockedUntil", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('cancelled', 'no_show'));
-- NOTE: this blocks group sessions (service capacity > 1) that share a start time.
-- If you use capacity > 1, skip this constraint and rely on the advisory lock.
