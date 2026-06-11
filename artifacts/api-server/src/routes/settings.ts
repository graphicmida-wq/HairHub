import { Router, type IRouter } from "express";
import { dbGetSettings, dbUpdateSettings } from "../data/db";
import {
  UpdateSettingsBody,
  GetSettingsResponse,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/settings", async (req, res) => {
  const data = await dbGetSettings();
  const parsed = GetSettingsResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /settings");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/settings", requireAuth, requireAdmin, async (req, res) => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = await dbUpdateSettings(body.data);
  const parsed = UpdateSettingsResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /settings");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

export default router;
