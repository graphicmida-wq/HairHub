import type { Request, Response, NextFunction } from "express";
import { AUTH_COOKIE, verifyToken, type TokenPayload, type Role } from "../lib/auth";
import { dbGetUser } from "../data/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Reject the request with 401 unless a valid auth cookie is present AND the user
 * still exists. The token is only a ~7-day-old claim, so we re-load the user from
 * the DB on every request: this kills sessions for deleted users and ensures the
 * role attached to req.user reflects the current DB value (not a stale token).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = (req.cookies as Record<string, unknown> | undefined)?.[AUTH_COOKIE];
  const payload = typeof raw === "string" ? verifyToken(raw) : null;
  if (!payload) {
    res.status(401).json({ message: "Non autenticato" });
    return;
  }
  try {
    const user = await dbGetUser(payload.sub);
    if (!user) {
      res.status(401).json({ message: "Non autenticato" });
      return;
    }
    req.user = { ...payload, username: user.username, role: user.role as Role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Reject the request with 403 unless the authenticated user is an admin. Must be
 * mounted after requireAuth (which populates req.user with the fresh DB role).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: "Non autenticato" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Accesso riservato agli amministratori" });
    return;
  }
  next();
}
