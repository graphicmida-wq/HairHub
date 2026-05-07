import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";

const router: IRouter = Router();

router.get("/services", (_req, res) => {
  res.json(dataStore.getServices());
});

router.post("/services", (req, res) => {
  const { name, category, durationMins, price, notes } = req.body;
  if (!name || !category || durationMins == null || price == null) {
    res.status(400).json({ message: "name, category, durationMins, price are required" });
    return;
  }
  const service = dataStore.createService({ name, category, durationMins: Number(durationMins), price: Number(price), notes });
  res.status(201).json(service);
});

router.put("/services/:id", (req, res) => {
  const updated = dataStore.updateService(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ message: "Service not found" });
    return;
  }
  res.json(updated);
});

router.delete("/services/:id", (req, res) => {
  dataStore.deleteService(req.params.id);
  res.status(204).send();
});

export default router;
