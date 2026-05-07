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
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", async (_req, res) => {
  const clients = await dbGetClients();
  res.json(clients);
});

router.post("/clients", async (req, res) => {
  const result = CreateClientBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const client = await dbCreateClient(result.data);
  res.status(201).json(client);
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
  res.json(client);
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
  res.json(updated);
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
