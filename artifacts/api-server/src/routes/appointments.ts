import { Router, type IRouter } from "express";
import {
  dbGetAppointments,
  dbGetAppointment,
  dbCreateAppointment,
  dbUpdateAppointment,
  dbDeleteAppointment,
  dbGetProduct,
  dbUpdateProduct,
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
} from "@workspace/api-zod";

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
  const parsed = GetAppointmentResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /appointments");
    res.status(500).json({ message: "Internal server error" });
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

  // Deduct stock when completing with usedProducts.
  // Intentional: deduction fires only on first transition to "completato".
  // Post-completion edits (e.g. changing usedProducts on an already-completed appointment)
  // do NOT re-reconcile stock. This avoids double-deduction and keeps the logic simple.
  const isCompletingNow = body.data.status === "completato" && existing.status !== "completato";
  if (isCompletingNow && body.data.usedProducts && body.data.usedProducts.length > 0) {
    // Aggregate quantities by productId to avoid duplicate-entry race conditions
    const aggregated = new Map<string, number>();
    for (const { productId, quantityUsed } of body.data.usedProducts) {
      if (quantityUsed > 0) {
        aggregated.set(productId, (aggregated.get(productId) ?? 0) + quantityUsed);
      }
    }
    for (const [productId, totalUsed] of aggregated) {
      const product = await dbGetProduct(productId);
      if (!product) continue;
      if (product.stockGrams != null) {
        const newStock = Math.max(0, Number(product.stockGrams) - totalUsed);
        const patch: Parameters<typeof dbUpdateProduct>[1] = { stockGrams: newStock };
        if (product.unitSize != null && Number(product.unitSize) > 0) {
          patch.quantity = Math.max(0, Math.floor(newStock / Number(product.unitSize)));
        }
        await dbUpdateProduct(productId, patch);
      }
    }
  }

  let updated: Awaited<ReturnType<typeof dbUpdateAppointment>>;
  try {
    updated = await dbUpdateAppointment(params.data.id, body.data);
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
  const parsed = UpdateAppointmentResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /appointments/:id");
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
  await dbDeleteAppointment(params.data.id);
  res.status(204).send();
});

export default router;
