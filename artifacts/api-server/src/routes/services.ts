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
  GetServiceParams,
  UpdateServiceParams,
  DeleteServiceParams,
  ListServicesResponse,
  GetServiceResponse,
  UpdateServiceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (req, res) => {
  const data = await dbGetServices();
  const parsed = ListServicesResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /services");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/services", async (req, res) => {
  const body = CreateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const created = await dbCreateService(body.data);
  const parsed = GetServiceResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /services");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.get("/services/:id", async (req, res) => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const service = await dbGetService(params.data.id);
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  const parsed = GetServiceResponse.safeParse(service);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /services/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
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
  const parsed = UpdateServiceResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /services/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
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
