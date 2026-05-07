import { Router, type IRouter } from "express";
import { dbGetSettings, dbUpdateSettings } from "../data/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", (_req, res) => {
  res.json(dbGetSettings());
});

router.put("/settings", (req, res) => {
  const result = UpdateSettingsBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = dbUpdateSettings(result.data);
  res.json(updated);
});

export default router;
