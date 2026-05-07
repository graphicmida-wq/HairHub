import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";

const router: IRouter = Router();

router.get("/products", (_req, res) => {
  res.json(dataStore.getProducts());
});

router.post("/products", (req, res) => {
  const { name, category, brand, quantity, minThreshold, supplier, notes } = req.body;
  if (!name || !category || !brand || quantity == null || minThreshold == null) {
    res.status(400).json({ message: "name, category, brand, quantity, minThreshold are required" });
    return;
  }
  const product = dataStore.createProduct({
    name, category, brand,
    quantity: Number(quantity),
    minThreshold: Number(minThreshold),
    supplier, notes
  });
  res.status(201).json(product);
});

router.put("/products/:id", (req, res) => {
  const updated = dataStore.updateProduct(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(updated);
});

router.delete("/products/:id", (req, res) => {
  dataStore.deleteProduct(req.params.id);
  res.status(204).send();
});

export default router;
