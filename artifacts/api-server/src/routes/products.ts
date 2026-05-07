import { Router, type IRouter } from "express";
import {
  dbGetProducts,
  dbGetProduct,
  dbCreateProduct,
  dbUpdateProduct,
  dbDeleteProduct,
} from "../data/db";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res) => {
  const products = await dbGetProducts();
  res.json(products);
});

router.post("/products", async (req, res) => {
  const result = CreateProductBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const product = await dbCreateProduct(result.data);
  res.status(201).json(product);
});

router.get("/products/:id", async (req, res) => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const product = await dbGetProduct(params.data.id);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
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
  const updated = await dbUpdateProduct(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(updated);
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
