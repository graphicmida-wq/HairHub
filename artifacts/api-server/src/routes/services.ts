import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";
import {
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  DeleteServiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", (_req, res) => {
  res.json(dataStore.getServices());
});

router.post("/services", (req, res) => {
  const result = CreateServiceBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const service = dataStore.createService(result.data);
  res.status(201).json(service);
});

router.get("/services/:id", (req, res) => {
  const service = dataStore.getService(req.params.id);
  if (!service) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(service);
});

router.put("/services/:id", (req, res) => {
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
  const updated = dataStore.updateService(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(updated);
});

router.delete("/services/:id", (req, res) => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  dataStore.deleteService(params.data.id);
  res.status(204).send();
});

export default router;
