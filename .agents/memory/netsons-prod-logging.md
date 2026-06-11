---
name: Netsons/Passenger prod logging blind spot
description: Why production errors were invisible during the appointments-500 incident, and how to make them visible.
---

# Netsons (cPanel Passenger) only captures stderr, not stdout

On the live Netsons deploy, Phusion Passenger writes the Node app's **stderr** to
`~/HairHub/lumii-app/stderr.log` but does **not** capture **stdout**.

`lib/logger.ts` uses pino, which writes to **stdout** in production (no transport when
`NODE_ENV=production`). So every `req.log.*` / `logger.*` line is lost in production:
`tail stderr.log` comes back empty even while the app is returning 500s.

**Why this matters:** during the GET /appointments 500 incident the real Zod error was
invisible — we had to deduce the cause from code (empty stderr + the exact
`{"message":"Internal server error"}` body proved it was a `safeParse` failure branch,
not a thrown SQL error which WOULD have reached Express's default handler → stderr).

**How to apply:**
- Don't trust an empty `stderr.log` to mean "no error." A caught error logged via pino
  won't appear there.
- An uncaught throw (e.g. mysql2 module crash, unknown-column) DOES reach stderr.log.
- To debug a caught/handled 500 in prod, either route prod pino output to stderr/a file,
  or temporarily `console.error` (fd 2) the detail so Passenger captures it.
