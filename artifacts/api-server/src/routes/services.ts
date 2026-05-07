import { Router, type IRouter } from "express";
import {
  dbGetServices,
  dbGetService,
  dbCreateService,
  dbUpdateService,
  dbDeleteService,
} from "../data/db";
import {
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  DeleteServiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (_req, res) => {
  const services = await dbGetServices();
  res.json(services);
});

router.post("/services", async (req, res) => {
  const result = CreateServiceBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const service = await dbCreateService(result.data);
  res.status(201).json(service);
});

router.get("/services/:id", async (req, res) => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const service = await dbGetService(params.data.id);
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(service);
});

router.put("/services/:id", async (req, res) => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = await dbUpdateService(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(updated);
});

router.delete("/services/:id", async (req, res) => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetService(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  await dbDeleteService(params.data.id);
  res.status(204).send();
});

export default router;
