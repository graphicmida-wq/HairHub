import { Router, type IRouter } from "express";
import {
  dbGetUsers,
  dbGetUser,
  dbGetUserByUsername,
  dbCreateUser,
  dbUpdateUser,
  dbDeleteUser,
} from "../data/db";
import {
  ListUsersResponse,
  ListUsersResponseItem,
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
  DeleteUserParams,
} from "@workspace/api-zod";
import { hashPassword, type Role } from "../lib/auth";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// All user-management routes are admin-only. requireAuth runs globally before
// this router is mounted, so req.user is already populated here.
router.use(requireAdmin);

interface SafeUser {
  id: string;
  username: string;
  role: string;
  name: string | null;
}

function toSafeUser(u: { id: string; username: string; role: string; name: string | null }): SafeUser {
  return { id: u.id, username: u.username, role: u.role, name: u.name ?? null };
}

router.get("/users", async (req, res) => {
  const data = await dbGetUsers();
  const parsed = ListUsersResponse.safeParse(data.map(toSafeUser));
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /users");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/users", async (req, res) => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Richiesta non valida" });
    return;
  }
  const existing = await dbGetUserByUsername(body.data.username);
  if (existing) {
    res.status(409).json({ message: "Username già esistente" });
    return;
  }
  const passwordHash = await hashPassword(body.data.password);
  const created = await dbCreateUser({
    username: body.data.username,
    passwordHash,
    role: body.data.role as Role,
    name: body.data.name ?? null,
  });
  const parsed = ListUsersResponseItem.safeParse(toSafeUser(created));
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /users");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.put("/users/:id", async (req, res) => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Richiesta non valida" });
    return;
  }
  const existing = await dbGetUser(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Utente non trovato" });
    return;
  }

  const update: Partial<{ username: string; passwordHash: string; role: Role; name: string | null }> = {};
  if (body.data.username !== undefined && body.data.username !== existing.username) {
    const dup = await dbGetUserByUsername(body.data.username);
    if (dup && dup.id !== existing.id) {
      res.status(409).json({ message: "Username già esistente" });
      return;
    }
    update.username = body.data.username;
  }
  if (body.data.name !== undefined) update.name = body.data.name ?? null;
  if (body.data.password) update.passwordHash = await hashPassword(body.data.password);

  // Prevent demoting the last remaining admin.
  if (body.data.role !== undefined && body.data.role !== existing.role) {
    if (existing.role === "admin" && body.data.role === "user") {
      const all = await dbGetUsers();
      const adminCount = all.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        res.status(400).json({ message: "Impossibile rimuovere l'unico amministratore" });
        return;
      }
    }
    update.role = body.data.role as Role;
  }

  // Nothing to change (empty body or only no-op fields): drizzle .set({}) throws,
  // so short-circuit and return the existing user unchanged.
  if (Object.keys(update).length === 0) {
    const same = UpdateUserResponse.safeParse(toSafeUser(existing));
    if (!same.success) {
      req.log.error({ err: same.error }, "Response schema mismatch on PUT /users/:id");
      res.status(500).json({ message: "Internal server error" });
      return;
    }
    res.json(same.data);
    return;
  }

  const updated = await dbUpdateUser(params.data.id, update);
  const parsed = UpdateUserResponse.safeParse(updated ? toSafeUser(updated) : undefined);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /users/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/users/:id", async (req, res) => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetUser(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Utente non trovato" });
    return;
  }
  if (req.user?.sub === params.data.id) {
    res.status(400).json({ message: "Non puoi eliminare il tuo account" });
    return;
  }
  if (existing.role === "admin") {
    const all = await dbGetUsers();
    const adminCount = all.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      res.status(400).json({ message: "Impossibile eliminare l'unico amministratore" });
      return;
    }
  }
  await dbDeleteUser(params.data.id);
  res.status(204).send();
});

export default router;
