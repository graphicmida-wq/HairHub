import { Router, type IRouter } from "express";
import {
  dbGetProducts,
  dbGetProduct,
  dbCreateProduct,
  dbUpdateProduct,
  dbDeleteProduct,
  dbEnsureCatalogTags,
} from "../data/db";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsResponse,
  GetProductResponse,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { actorFrom, logInitialStock, logProductStockChange } from "../lib/stock";

const router: IRouter = Router();

router.get("/products", async (req, res) => {
  const data = await dbGetProducts();
  const parsed = ListProductsResponse.safeParse(data);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /products");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const created = await dbCreateProduct(body.data);
  await logInitialStock(created, await actorFrom(req));
  // A brand or category typed on the fly joins the salon's list
  await dbEnsureCatalogTags("brand", [created.brand]);
  await dbEnsureCatalogTags("product_category", [created.category]);
  const parsed = GetProductResponse.safeParse(created);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on POST /products");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.status(201).json(parsed.data);
});

router.get("/products/:id", async (req, res) => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const product = await dbGetProduct(params.data.id);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  const parsed = GetProductResponse.safeParse(product);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /products/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/products/:id", async (req, res) => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const body = UpdateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const { stockChangeReason, stockChangeNote, ...changes } = body.data;
  const before = await dbGetProduct(params.data.id);
  const updated = await dbUpdateProduct(params.data.id, changes);
  if (!before || !updated) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  await logProductStockChange(before, updated, stockChangeReason, stockChangeNote, await actorFrom(req));
  await dbEnsureCatalogTags("brand", [updated.brand]);
  await dbEnsureCatalogTags("product_category", [updated.category]);
  const parsed = UpdateProductResponse.safeParse(updated);
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on PUT /products/:id");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.delete("/products/:id", async (req, res) => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const existing = await dbGetProduct(params.data.id);
  if (!existing) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  await dbDeleteProduct(params.data.id);
  res.status(204).send();
});

export default router;
