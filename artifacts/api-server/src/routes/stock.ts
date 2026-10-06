import { Router, type IRouter } from "express";
import { dbListStockMovements, type StockReason } from "../data/db";
import {
  CreateSaleBody,
  CancelSaleParams,
  DeleteStockMovementParams,
  DeleteProductMovementsParams,
  ListStockMovementsQueryParams,
  ListStockMovementsResponse,
} from "@workspace/api-zod";
import { actorFrom, cancelSale, createSale, deleteMovement, deleteProductHistory, StockError } from "../lib/stock";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

router.get("/stock-movements", async (req, res) => {
  const query = ListStockMovementsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: query.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { from, to, productId, clientId, reason } = query.data;
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    res.status(400).json({ message: "Date nel formato AAAA-MM-GG" });
    return;
  }
  const data = await dbListStockMovements({ from, to, productId, clientId, reason: reason as StockReason | undefined });
  const parsed = ListStockMovementsResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /stock-movements");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/sales", async (req, res) => {
  const body = CreateSaleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  if (!DATE_RE.test(body.data.date) || !TIME_RE.test(body.data.time)) {
    res.status(400).json({ message: "Data o ora non valide" });
    return;
  }
  try {
    const created = await createSale(body.data, await actorFrom(req));
    res.status(201).json(ListStockMovementsResponse.parse(created));
  } catch (err) {
    if (err instanceof StockError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    req.log.error({ err }, "Error on POST /sales");
    res.status(500).json({ message: `Vendita non registrata: ${(err as Error).message}` });
  }
});

router.post("/sales/:saleId/cancel", async (req, res) => {
  const params = CancelSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  try {
    const created = await cancelSale(params.data.saleId, await actorFrom(req));
    res.json(ListStockMovementsResponse.parse(created));
  } catch (err) {
    if (err instanceof StockError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    req.log.error({ err }, "Error on POST /sales/:saleId/cancel");
    res.status(500).json({ message: `Annullamento non riuscito: ${(err as Error).message}` });
  }
});

// Admin only: a wrong or test movement disappears and the stock is corrected
router.delete("/stock-movements/:id", requireAdmin, async (req, res) => {
  const params = DeleteStockMovementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  try {
    const deleted = await deleteMovement(params.data.id);
    res.json({ deleted });
  } catch (err) {
    if (err instanceof StockError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    req.log.error({ err }, "Error on DELETE /stock-movements/:id");
    res.status(500).json({ message: `Eliminazione non riuscita: ${(err as Error).message}` });
  }
});

// Admin only: a product created by mistake takes its history with it (called before deleting it)
router.delete("/products/:id/movements", requireAdmin, async (req, res) => {
  const params = DeleteProductMovementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  res.json({ deleted: await deleteProductHistory(params.data.id) });
});

export default router;
