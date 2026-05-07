import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";

const router: IRouter = Router();

router.get("/appointments", (_req, res) => {
  res.json(dataStore.getAppointments());
});

router.post("/appointments", (req, res) => {
  const { clientId, serviceId, date, time, durationMins, status, notes, usedProductIds } = req.body;
  if (!clientId || !serviceId || !date || !time || durationMins == null || !status) {
    res.status(400).json({ message: "clientId, serviceId, date, time, durationMins, status are required" });
    return;
  }
  const appointment = dataStore.createAppointment({
    clientId, serviceId, date, time,
    durationMins: Number(durationMins),
    status, notes,
    usedProductIds: usedProductIds ?? null,
  });
  res.status(201).json(appointment);
});

router.put("/appointments/:id", (req, res) => {
  const updated = dataStore.updateAppointment(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  res.json(updated);
});

router.delete("/appointments/:id", (req, res) => {
  dataStore.deleteAppointment(req.params.id);
  res.status(204).send();
});

export default router;
