import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Build marker — bump when shipping a deploy you need to confirm went live.
// Public (no auth) so it can be checked with a simple GET after a deploy:
//   curl https://<dominio>/api/version
const BUILD_VERSION = "salva-fix2-2026-06-11";

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/version", (_req, res) => {
  res.json({ version: BUILD_VERSION });
});

export default router;
