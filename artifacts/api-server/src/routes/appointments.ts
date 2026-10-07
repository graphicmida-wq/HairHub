import { Router, type IRouter } from "express";
import {
  dbGetAppointments,
  dbGetAppointment,
  dbCreateAppointment,
  dbUpdateAppointment,
  dbDeleteAppointment,
  dbSetAppointmentsReminder,
} from "../data/db";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsResponse,
  GetAppointmentResponse,
  UpdateAppointmentResponse,
  SetAppointmentRemindersBody,
  SetAppointmentRemindersResponse,
} from "@workspace/api-zod";
import { actorFrom, syncAppointmentStock } from "../lib/stock";

const router: IRouter = Router();

router.get("/appointments", async (req, res) => {
  const data = await dbGetAppointments();
  const rows = Array.isArray(data) ? data : [];

  // Resilient read: validate each appointment on its own so a single malformed
  // row (e.g. legacy data left over from a migration) can never blank the whole
  // Agenda + Dashboard. Valid rows are always returned; bad rows are skipped and
  // logged instead of turning into a 500 for the entire list.
  const valid = [] as ReturnType<typeof ListAppointmentsResponse.parse>;
  let skipped = 0;
  for (const row of rows) {
    const r = ListAppointmentsResponse.safeParse([row]);
    if (r.success) {
      valid.push(...r.data);
    } else {
      skipped += 1;
      const id = (row as { id?: unknown } | null)?.id;
      req.log.error(
        { err: r.error, appointmentId: id },
        "Skipping invalid appointment row on GET /appointments",
      );
    }
  }
  if (skipped > 0) {
    req.log.warn(
      { skipped, total: rows.length },
      "Some appointment rows failed validation and were skipped",
    );
  }
  res.json(valid);
});

router.post("/appointments", async (req, res) => {
  const body = CreateAppointmentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  let created: Awaited<ReturnType<typeof dbCreateAppointment>>;
  try {
    created = await dbCreateAppointment(body.data);
  } catch (err) {
    // Surface the real DB reason (e.g. a legacy NOT NULL column on an older MySQL
    // table) instead of a generic 500, so the failure is diagnosable from the UI.
    req.log.error({ err }, "DB error on POST /appointments");
    res.status(500).json({
      message: `Salvataggio non riuscito (database): ${(err as Error).message}`,
    });
    return;
  }
  if (created.status === "completato") {
    try {
      await syncAppointmentStock(created, await actorFrom(req));
    } catch (err) {
      req.log.error({ err }, "Stock sync failed on POST /appointments");
    }
  }
  const parsed = GetAppointmentResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /appointments");
    const issue = parsed.error.issues[0];
    res.status(500).json({
      message: `Appuntamento salvato ma risposta non valida${issue ? ` (${issue.path.join(".") || "campo"}: ${issue.message})` : ""}`,
    });
    return;
  }
  res.status(201).json(parsed.data);
});

router.get("/appointments/:id", async (req, res) => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const appointment = await dbGetAppointment(params.data.id);
  if (!appointment) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  const parsed = GetAppointmentResponse.safeParse(appointment);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /appointments/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/appointments/:id", async (req, res) => {
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

  const existing = await dbGetAppointment(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }

  // A reminder sent for the old day or time no longer holds once the appointment moves
  const moved =
    (body.data.date !== undefined && body.data.date !== existing.date) ||
    (body.data.time !== undefined && body.data.time !== existing.time);

  let updated: Awaited<ReturnType<typeof dbUpdateAppointment>>;
  try {
    updated = await dbUpdateAppointment(
      params.data.id,
      moved && existing.reminderSentAt ? { ...body.data, reminderSentAt: null } : body.data,
    );
  } catch (err) {
    req.log.error({ err }, "DB error on PUT /appointments/:id");
    res.status(500).json({
      message: `Salvataggio non riuscito (database): ${(err as Error).message}`,
    });
    return;
  }
  if (!updated) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  // Products sold/used count only once the appointment is completed; any later
  // edit (products, status) books the difference. Idempotent, so saving again
  // after a failure here heals the stock.
  try {
    await syncAppointmentStock(updated, await actorFrom(req));
  } catch (err) {
    req.log.error({ err }, "Stock sync failed on PUT /appointments/:id");
    res.status(500).json({
      message: `Appuntamento salvato ma magazzino non aggiornato: ${(err as Error).message}. Riprova a salvare.`,
    });
    return;
  }
  const parsed = UpdateAppointmentResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /appointments/:id");
    const issue = parsed.error.issues[0];
    res.status(500).json({
      message: `Modifica salvata ma risposta non valida${issue ? ` (${issue.path.join(".") || "campo"}: ${issue.message})` : ""}`,
    });
    return;
  }
  res.json(parsed.data);
});

// The WhatsApp reminder itself is sent by hand from the user's own WhatsApp:
// this only records that it went out (or clears the mark).
router.post("/appointment-reminders", async (req, res) => {
  const body = SetAppointmentRemindersBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const updated = await dbSetAppointmentsReminder(
    [...new Set(body.data.appointmentIds)],
    body.data.sent ? new Date().toISOString() : null,
  );
  const parsed = SetAppointmentRemindersResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /appointment-reminders");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/appointments/:id", async (req, res) => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetAppointment(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Appointment not found" });
    return;
  }
  // Whatever the appointment took out of the stock goes back, with a trace.
  await syncAppointmentStock(existing, await actorFrom(req), { removed: true });
  await dbDeleteAppointment(params.data.id);
  res.status(204).send();
});

export default router;
