import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";

const router: IRouter = Router();

router.get("/settings", (_req, res) => {
  res.json(dataStore.getSettings());
});

router.put("/settings", (req, res) => {
  const updated = dataStore.updateSettings(req.body);
  res.json(updated);
});

export default router;
