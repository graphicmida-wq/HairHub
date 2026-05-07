import { Router, type IRouter } from "express";
import {
  dbGetStaff,
  dbGetStaffMember,
  dbCreateStaffMember,
  dbUpdateStaffMember,
  dbDeleteStaffMember,
} from "../data/db";
import {
  ListStaffResponse,
  ListStaffResponseItem,
  CreateStaffMemberBody,
  UpdateStaffMemberBody,
  UpdateStaffMemberParams,
  UpdateStaffMemberResponse,
  DeleteStaffMemberParams,
} from "@workspace/api-zod";

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

router.post("/staff", async (req, res) => {
  const body = CreateStaffMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const created = await dbCreateStaffMember(body.data);
  const parsed = ListStaffResponseItem.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /staff");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.put("/staff/:id", async (req, res) => {
  const params = UpdateStaffMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateStaffMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const existing = await dbGetStaffMember(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Staff member not found" });
    return;
  }
  const updated = await dbUpdateStaffMember(params.data.id, body.data);
  const parsed = UpdateStaffMemberResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /staff/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/staff/:id", async (req, res) => {
  const params = DeleteStaffMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetStaffMember(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Staff member not found" });
    return;
  }
  await dbDeleteStaffMember(params.data.id);
  res.status(204).send();
});

export default router;
