import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", (_req, res) => {
  res.json(dataStore.getProducts());
});

router.post("/products", (req, res) => {
  const result = CreateProductBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const product = dataStore.createProduct(result.data);
  res.status(201).json(product);
});

router.get("/products/:id", (req, res) => {
  const product = dataStore.getProduct(req.params.id);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
});

router.put("/products/:id", (req, res) => {
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
  const updated = dataStore.updateProduct(params.data.id, body.data);
  if (!updated) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(updated);
});

router.delete("/products/:id", (req, res) => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  dataStore.deleteProduct(params.data.id);
  res.status(204).send();
});

export default router;
