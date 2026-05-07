import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", (_req, res) => {
  res.json(dataStore.getSettings());
});

router.put("/settings", (req, res) => {
  const result = UpdateSettingsBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = dataStore.updateSettings(result.data);
  res.json(updated);
});

export default router;
