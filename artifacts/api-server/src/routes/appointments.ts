import { Router, type IRouter } from "express";
import {
  dbGetAppointments,
  dbGetAppointment,
  dbCreateAppointment,
  dbUpdateAppointment,
  dbDeleteAppointment,
} from "../data/db";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/appointments", (_req, res) => {
  res.json(dbGetAppointments());
});

router.post("/appointments", (req, res) => {
  const result = CreateAppointmentBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const appointment = dbCreateAppointment(result.data);
  res.status(201).json(appointment);
});

router.get("/appointments/:id", (req, res) => {
  const appointment = dbGetAppointment(req.params.id);
  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.json(appointment);
});

router.put("/appointments/:id", (req, res) => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateAppointmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = dbUpdateAppointment(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.json(updated);
});

router.delete("/appointments/:id", (req, res) => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = dbGetAppointment(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  dbDeleteAppointment(params.data.id);
  res.status(204).send();
});

export default router;
