import { Router, type IRouter } from "express";
import { dbGetStaff } from "../data/db";
import { ListStaffResponse } from "@workspace/api-zod";

// Read-only list for the agenda, appointments and reports. People are added,
// changed and removed on the Team page (routes/team.ts, admin only).
const router: IRouter = Router();

router.get("/staff", async (req, res) => {
  const data = await dbGetStaff();
  const parsed = ListStaffResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /staff");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

export default router;
