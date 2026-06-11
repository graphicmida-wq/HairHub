import { Router, type IRouter } from "express";
import {
  dbGetClientFormulas,
  dbGetClientFormula,
  dbCreateClientFormula,
  dbUpdateClientFormula,
  dbDeleteClientFormula,
} from "../data/db";
import {
  CreateClientFormulaBody,
  UpdateClientFormulaBody,
  GetClientFormulaParams,
  UpdateClientFormulaParams,
  DeleteClientFormulaParams,
  ListClientFormulasResponse,
  GetClientFormulaResponse,
  UpdateClientFormulaResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/client-formulas", async (req, res) => {
  const clientId = typeof req.query["clientId"] === "string" ? req.query["clientId"] : undefined;
  const data = await dbGetClientFormulas(clientId);
  const parsed = ListClientFormulasResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /client-formulas");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/client-formulas", async (req, res) => {
  const body = CreateClientFormulaBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  let created: Awaited<ReturnType<typeof dbCreateClientFormula>>;
  try {
    created = await dbCreateClientFormula(body.data);
  } catch (err) {
    req.log.error({ err }, "DB error on POST /client-formulas");
    res.status(500).json({
      message: `Formula non salvata (database): ${(err as Error).message}`,
    });
    return;
  }
  const parsed = GetClientFormulaResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /client-formulas");
    const issue = parsed.error.issues[0];
    res.status(500).json({
      message: `Formula salvata ma risposta non valida${issue ? ` (${issue.path.join(".") || "campo"}: ${issue.message})` : ""}`,
    });
    return;
  }
  res.status(201).json(parsed.data);
});

router.get("/client-formulas/:id", async (req, res) => {
  const params = GetClientFormulaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const formula = await dbGetClientFormula(params.data.id);
  if (!formula) {
    res.status(404).json({ message: "Formula not found" });
    return;
  }
  const parsed = GetClientFormulaResponse.safeParse(formula);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /client-formulas/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/client-formulas/:id", async (req, res) => {
  const params = UpdateClientFormulaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateClientFormulaBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const formula = await dbGetClientFormula(params.data.id);
  if (!formula) {
    res.status(404).json({ message: "Formula not found" });
    return;
  }
  let updated: Awaited<ReturnType<typeof dbUpdateClientFormula>>;
  try {
    updated = await dbUpdateClientFormula(params.data.id, body.data);
  } catch (err) {
    req.log.error({ err }, "DB error on PUT /client-formulas/:id");
    res.status(500).json({
      message: `Formula non aggiornata (database): ${(err as Error).message}`,
    });
    return;
  }
  const parsed = UpdateClientFormulaResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /client-formulas/:id");
    const issue = parsed.error.issues[0];
    res.status(500).json({
      message: `Formula aggiornata ma risposta non valida${issue ? ` (${issue.path.join(".") || "campo"}: ${issue.message})` : ""}`,
    });
    return;
  }
  res.json(parsed.data);
});

router.delete("/client-formulas/:id", async (req, res) => {
  const params = DeleteClientFormulaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetClientFormula(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Formula not found" });
    return;
  }
  await dbDeleteClientFormula(params.data.id);
  res.status(204).send();
});

export default router;
