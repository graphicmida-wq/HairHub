import { Router, type IRouter } from "express";
import {
  dbGetClients,
  dbGetClient,
  dbGetClientByPhone,
  dbSearchClients,
  dbCreateClient,
  dbUpdateClient,
  dbDeleteClient,
  dbGetSettings,
} from "../data/db";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
  ListClientsResponse,
  GetClientResponse,
  UpdateClientResponse,
  SetClientBirthdayGreetingBody,
  SetClientBirthdayGreetingResponse,
  SetClientBirthdayPromoUsedBody,
  SetClientBirthdayPromoUsedResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  const limit = Number.isFinite(limitRaw) ? (limitRaw as number) : 20;
  const data = await dbSearchClients(q, limit);
  const parsed = ListClientsResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /clients/search");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.get("/clients/by-phone", async (req, res) => {
  const phone = typeof req.query.phone === "string" ? req.query.phone : "";
  if (!phone.trim()) {
    res.status(400).json({ message: "Missing phone" });
    return;
  }
  const existing = await dbGetClientByPhone(phone);
  if (!existing) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  const parsed = GetClientResponse.safeParse(existing);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /clients/by-phone");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.get("/clients", async (req, res) => {
  const data = await dbGetClients();
  const parsed = ListClientsResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /clients");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/clients", async (req, res) => {
  const body = CreateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }

  const existing = await dbGetClientByPhone(body.data.phone);
  if (existing) {
    res.status(409).json({ message: "Cliente già esistente", existingClient: existing });
    return;
  }

  const created = await dbCreateClient(body.data);
  const parsed = GetClientResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /clients");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.get("/clients/:id", async (req, res) => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const client = await dbGetClient(params.data.id);
  if (!client) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  const parsed = GetClientResponse.safeParse(client);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /clients/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/clients/:id", async (req, res) => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = await dbUpdateClient(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  const parsed = UpdateClientResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /clients/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

const DEFAULT_BIRTHDAY_PROMO_DAYS = 30;

/** "2026-10-08" + 30 days → "2026-11-07" (calendar arithmetic, no time zone involved) */
function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

// The wishes themselves go out by hand from the user's WhatsApp: this records that
// they were sent and the promotion they promised (the salon's text at that moment).
router.post("/client-birthday-greetings", async (req, res) => {
  const body = SetClientBirthdayGreetingBody.safeParse(req.body);
  if (!body.success || (body.data.sent && !body.data.birthday)) {
    res.status(400).json({ message: body.success ? "Missing birthday" : body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  if (!(await dbGetClient(body.data.clientId))) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  let patch;
  if (body.data.sent) {
    const settings = await dbGetSettings();
    const promo = settings.birthdayPromo?.trim() || null;
    const days = settings.birthdayPromoDays ?? DEFAULT_BIRTHDAY_PROMO_DAYS;
    patch = {
      birthdayGreetedAt: new Date().toISOString(),
      birthdayPromo: promo,
      birthdayPromoUntil: promo ? addDaysYmd(body.data.birthday!, days) : null,
      birthdayPromoUsedAt: null,
    };
  } else {
    patch = { birthdayGreetedAt: null, birthdayPromo: null, birthdayPromoUntil: null, birthdayPromoUsedAt: null };
  }
  const updated = await dbUpdateClient(body.data.clientId, patch);
  const parsed = SetClientBirthdayGreetingResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /client-birthday-greetings");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/client-birthday-promo", async (req, res) => {
  const body = SetClientBirthdayPromoUsedBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const client = await dbGetClient(body.data.clientId);
  if (!client) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  if (!client.birthdayPromo) {
    res.status(400).json({ message: "Nessuna promozione di compleanno per questa cliente" });
    return;
  }
  const updated = await dbUpdateClient(body.data.clientId, {
    birthdayPromoUsedAt: body.data.used ? new Date().toISOString() : null,
  });
  const parsed = SetClientBirthdayPromoUsedResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /client-birthday-promo");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/clients/:id", async (req, res) => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetClient(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  await dbDeleteClient(params.data.id);
  res.status(204).send();
});

export default router;
