---
name: Auth guard DB re-check
description: Why the requireAuth middleware re-loads the user from the DB on every request instead of trusting the JWT claims.
---

`requireAuth` re-loads the user from the DB (`dbGetUser(payload.sub)`) on every request and rebuilds `req.user.role`/`username` from the DB row, rather than trusting the decoded JWT alone.

**Why:** the session token is a long-lived cookie (~7 days). If the guard trusted only the token, a user deleted by an admin would keep full data access until expiry, and an admin demoted to `user` would keep admin powers (user CRUD, settings write) for up to 7 days. Re-checking the DB makes role changes and deletions take effect immediately.

**How to apply:** keep any new auth/role logic (e.g. `requireAdmin`) reading from `req.user` *after* `requireAuth` has refreshed it from the DB — do not re-decode the token and trust its claims directly. If you add more session-derived authorization, source the authoritative role/state from the DB, not the token payload.
