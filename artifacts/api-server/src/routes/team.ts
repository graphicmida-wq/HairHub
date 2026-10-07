import { Router, type IRouter } from "express";
import {
  dbGetStaff,
  dbGetStaffMember,
  dbCreateStaffMember,
  dbUpdateStaffMember,
  dbDeleteStaffMember,
  dbGetUsers,
  dbGetUserByUsername,
  dbCreateUser,
  dbUpdateUser,
  dbDeleteUser,
  type CreateUserData,
} from "../data/db";
import {
  ListTeamResponse,
  ListTeamResponseItem,
  CreateTeamMemberBody,
  UpdateTeamMemberParams,
  UpdateTeamMemberBody,
  UpdateTeamMemberResponse,
  DeleteTeamMemberParams,
} from "@workspace/api-zod";
import { hashPassword, type Role } from "../lib/auth";
import { requireAdmin } from "../middlewares/auth";
import { effectivePermissions, serializePermissions } from "../lib/permissions";

// The people of the salon in one list: each person is a staff member (agenda
// column, colour) and can also have a login (users row with staff_id = person).
// Admin only, guarded per route so unmatched requests still fall through.
const router: IRouter = Router();

type Person = Awaited<ReturnType<typeof dbGetStaff>>[number];
type Login = Awaited<ReturnType<typeof dbGetUsers>>[number];

function toTeamMember(person: Person, login: Login | undefined) {
  return {
    id: person.id,
    name: person.name,
    role: person.role ?? null,
    color: person.color,
    inAgenda: Boolean(person.inAgenda),
    access: login
      ? {
          userId: login.id,
          username: login.username,
          level: login.role,
          permissions: effectivePermissions(login),
        }
      : null,
  };
}

async function loadTeamMember(id: string) {
  const person = await dbGetStaffMember(id);
  if (!person) return undefined;
  const logins = await dbGetUsers();
  return toTeamMember(person, logins.find((u) => u.staffId === person.id));
}

const countAdmins = (logins: Login[]) => logins.filter((u) => u.role === "admin").length;

router.get("/team", requireAdmin, async (req, res) => {
  const [people, logins] = await Promise.all([dbGetStaff(), dbGetUsers()]);
  const data = people.map((p) => toTeamMember(p, logins.find((u) => u.staffId === p.id)));
  const parsed = ListTeamResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /team");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/team", requireAdmin, async (req, res) => {
  const body = CreateTeamMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Richiesta non valida" });
    return;
  }
  const { access } = body.data;
  const name = body.data.name.trim();
  if (!name) {
    res.status(400).json({ message: "Inserisci il nome" });
    return;
  }

  // Check the login before creating anything, so a taken username leaves no half-made person
  let login: Omit<CreateUserData, "staffId"> | null = null;
  if (access) {
    const username = access.username.trim();
    if (!username) {
      res.status(400).json({ message: "Inserisci il nome utente" });
      return;
    }
    if (await dbGetUserByUsername(username)) {
      res.status(409).json({ message: "Nome utente già in uso" });
      return;
    }
    login = {
      username,
      passwordHash: await hashPassword(access.password),
      role: access.level as Role,
      name,
      permissions:
        access.level === "admin" || access.permissions === undefined
          ? null
          : serializePermissions(access.permissions),
    };
  }

  const person = await dbCreateStaffMember({
    name,
    role: body.data.role?.trim() || null,
    color: body.data.color,
    inAgenda: body.data.inAgenda,
  });
  if (login) await dbCreateUser({ ...login, staffId: person.id });

  const parsed = ListTeamResponseItem.safeParse(await loadTeamMember(person.id));
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /team");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.put("/team/:id", requireAdmin, async (req, res) => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateTeamMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Richiesta non valida" });
    return;
  }
  const person = await dbGetStaffMember(params.data.id);
  if (!person) {
    res.status(404).json({ message: "Persona non trovata" });
    return;
  }
  const logins = await dbGetUsers();
  const login = logins.find((u) => u.staffId === person.id);
  const isSelf = !!login && req.user?.sub === login.id;
  const { access } = body.data;

  const personPatch: Partial<{ name: string; role: string | null; color: string; inAgenda: boolean }> = {};
  if (body.data.name !== undefined) {
    const name = body.data.name.trim();
    if (!name) {
      res.status(400).json({ message: "Inserisci il nome" });
      return;
    }
    personPatch.name = name;
  }
  if (body.data.role !== undefined) personPatch.role = body.data.role?.trim() || null;
  if (body.data.color !== undefined) personPatch.color = body.data.color;
  if (body.data.inAgenda !== undefined) personPatch.inAgenda = body.data.inAgenda;
  const finalName = personPatch.name ?? person.name;

  // Validate every access change before writing anything
  let removeLogin = false;
  let newLogin: CreateUserData | null = null;
  const loginPatch: Partial<{
    username: string;
    passwordHash: string;
    role: Role;
    name: string | null;
    permissions: string | null;
  }> = {};

  if (access === null) {
    if (login) {
      if (isSelf) {
        res.status(400).json({ message: "Non puoi togliere l'accesso a te stesso" });
        return;
      }
      if (login.role === "admin" && countAdmins(logins) <= 1) {
        res.status(400).json({ message: "Serve almeno un amministratore" });
        return;
      }
      removeLogin = true;
    }
  } else if (access) {
    const username = access.username?.trim();
    if (access.username !== undefined && !username) {
      res.status(400).json({ message: "Inserisci il nome utente" });
      return;
    }
    if (username && username !== login?.username) {
      const taken = await dbGetUserByUsername(username);
      if (taken && taken.id !== login?.id) {
        res.status(409).json({ message: "Nome utente già in uso" });
        return;
      }
    }
    if (login) {
      if (username && username !== login.username) loginPatch.username = username;
      if (access.password) loginPatch.passwordHash = await hashPassword(access.password);
      const level = (access.level ?? login.role) as Role;
      if (level !== login.role) {
        if (isSelf) {
          res.status(400).json({ message: "Non puoi cambiare il tuo livello di accesso" });
          return;
        }
        if (login.role === "admin" && countAdmins(logins) <= 1) {
          res.status(400).json({ message: "Serve almeno un amministratore" });
          return;
        }
        loginPatch.role = level;
      }
      if (level === "admin") {
        if (login.permissions !== null) loginPatch.permissions = null;
      } else if (access.permissions !== undefined) {
        loginPatch.permissions = serializePermissions(access.permissions);
      }
    } else {
      if (!username || !access.password) {
        res.status(400).json({ message: "Per dare l'accesso servono nome utente e password" });
        return;
      }
      const level = (access.level ?? "user") as Role;
      newLogin = {
        username,
        passwordHash: await hashPassword(access.password),
        role: level,
        name: finalName,
        staffId: person.id,
        permissions:
          level === "admin" || access.permissions === undefined ? null : serializePermissions(access.permissions),
      };
    }
  }
  if (login && !removeLogin && personPatch.name !== undefined) loginPatch.name = finalName;

  if (Object.keys(personPatch).length > 0) await dbUpdateStaffMember(person.id, personPatch);
  if (removeLogin && login) await dbDeleteUser(login.id);
  if (newLogin) await dbCreateUser(newLogin);
  if (login && !removeLogin && Object.keys(loginPatch).length > 0) await dbUpdateUser(login.id, loginPatch);

  const parsed = UpdateTeamMemberResponse.safeParse(await loadTeamMember(person.id));
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /team/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/team/:id", requireAdmin, async (req, res) => {
  const params = DeleteTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const person = await dbGetStaffMember(params.data.id);
  if (!person) {
    res.status(404).json({ message: "Persona non trovata" });
    return;
  }
  const logins = await dbGetUsers();
  const login = logins.find((u) => u.staffId === person.id);
  if (login) {
    if (req.user?.sub === login.id) {
      res.status(400).json({ message: "Non puoi eliminare te stesso" });
      return;
    }
    if (login.role === "admin" && countAdmins(logins) <= 1) {
      res.status(400).json({ message: "Serve almeno un amministratore" });
      return;
    }
    await dbDeleteUser(login.id);
  }
  await dbDeleteStaffMember(person.id);
  res.status(204).send();
});

export default router;
