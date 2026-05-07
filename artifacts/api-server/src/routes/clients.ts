import { Router, type IRouter } from "express";
import {
  dbGetClients,
  dbGetClient,
  dbCreateClient,
  dbUpdateClient,
  dbDeleteClient,
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
} from "@workspace/api-zod";

const router: IRouter = Router();

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
