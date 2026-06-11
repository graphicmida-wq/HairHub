---
name: List-endpoint response validation fragility
description: One bad row can 500 an entire list endpoint; response Zod constraints must match what migrations can actually produce.
---

# Whole-list safeParse means one bad row kills the whole endpoint

The list routes validate the **entire array** in one shot
(`ListAppointmentsResponse.safeParse(data)`); on failure they return a generic 500.
So a SINGLE row that violates any response-schema constraint takes down the whole
endpoint (and cascades: Agenda dies, Dashboard `useStats` flips to error because it
aggregates appointments+clients+services+products).

**Concrete incident:** OpenAPI had `serviceIds: minItems: 1`, but the MySQL migration
runs `UPDATE appointments SET service_ids = JSON_ARRAY() WHERE service_ids IS NULL`,
which legitimately creates **empty** `serviceIds` arrays for rows not backfilled from the
legacy single `service_id`. One empty-array row → `min(1)` fails → entire GET 500s.
Dev (SQLite, seeded clean data) never hit it; only real migrated MySQL data did.

**Rule / Why:** A response-schema constraint (`minItems`, `min`, enum, required) is a
promise about *every row already in the DB*, including legacy/backfilled rows. If a
migration or backfill can produce a value the response schema forbids, the read endpoint
will 500 in production even though the query and columns are fine.

**How to apply:**
- Before adding/keeping a response constraint, ask "can any existing or migrated row
  violate this?" If yes, relax it (keep the stricter rule on the INPUT schema if needed).
- Prefer per-row validation with skip-and-log over whole-array safeParse for list reads,
  so one malformed row degrades gracefully instead of blanking the screen.
- After editing constraints in `lib/api-spec/openapi.yaml`, always rerun
  `pnpm --filter @workspace/api-spec run codegen` and rebuild `lumii-app/`.
