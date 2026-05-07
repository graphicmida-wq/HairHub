import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";
import {
  CreateClientBody,
  UpdateClientBody,
  DeleteClientParams,
  GetClientParams,
  UpdateClientParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", (_req, res) => {
  res.json(dataStore.getClients());
});

router.post("/clients", (req, res) => {
  const result = CreateClientBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const client = dataStore.createClient(result.data);
  res.status(201).json(client);
});

router.get("/clients/:id", (req, res) => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const client = dataStore.getClient(params.data.id);
  if (!client) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  res.json(client);
});

router.put("/clients/:id", (req, res) => {
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
  const updated = dataStore.updateClient(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  res.json(updated);
});

router.delete("/clients/:id", (req, res) => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  dataStore.deleteClient(params.data.id);
  res.status(204).send();
});

export default router;
