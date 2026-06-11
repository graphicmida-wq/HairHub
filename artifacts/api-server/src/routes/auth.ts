import { Router, type IRouter } from "express";
import { dbGetUser, dbGetUserByUsername } from "../data/db";
import { LoginBody, LoginResponse, GetCurrentUserResponse } from "@workspace/api-zod";
import {
  AUTH_COOKIE,
  authCookieOptions,
  signToken,
  verifyPassword,
  verifyToken,
  type Role,
} from "../lib/auth";

const router: IRouter = Router();

function clearAuthCookie(res: Parameters<Parameters<IRouter["post"]>[1]>[1]): void {
  const { maxAge: _ignored, ...clearOpts } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE, clearOpts);
}

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Richiesta non valida" });
    return;
  }
  const user = await dbGetUserByUsername(body.data.username);
  if (!user) {
    res.status(401).json({ message: "Credenziali non valide" });
    return;
  }
  const ok = await verifyPassword(body.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Credenziali non valide" });
    return;
  }
  const token = signToken({ sub: user.id, username: user.username, role: user.role as Role });
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  const parsed = LoginResponse.safeParse({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name ?? null,
  });
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /auth/login");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

router.get("/auth/me", async (req, res) => {
  const raw = (req.cookies as Record<string, unknown> | undefined)?.[AUTH_COOKIE];
  const tokenPayload = typeof raw === "string" ? verifyToken(raw) : null;
  if (!tokenPayload) {
    res.status(401).json({ message: "Non autenticato" });
    return;
  }
  const user = await dbGetUser(tokenPayload.sub);
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ message: "Non autenticato" });
    return;
  }
  const parsed = GetCurrentUserResponse.safeParse({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name ?? null,
  });
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /auth/me");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

export default router;
