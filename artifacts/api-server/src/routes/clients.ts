import { Router, type IRouter } from "express";
import { dataStore } from "../data/store";

const router: IRouter = Router();

router.get("/clients", (req, res) => {
  res.json(dataStore.getClients());
});

router.post("/clients", (req, res) => {
  const { firstName, lastName, phone, email, dob, notes, allergies, hairSpecs } = req.body as Record<string, string>;
  if (!firstName || !lastName || !phone || !email) {
    res.status(400).json({ message: "firstName, lastName, phone, email are required" });
    return;
  }
  const client = dataStore.createClient({ firstName, lastName, phone, email, dob, notes, allergies, hairSpecs });
  res.status(201).json(client);
});

router.get("/clients/:id", (req, res) => {
  const client = dataStore.getClient(req.params.id);
  if (!client) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  res.json(client);
});

router.put("/clients/:id", (req, res) => {
  const updated = dataStore.updateClient(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ message: "Client not found" });
    return;
  }
  res.json(updated);
});

router.delete("/clients/:id", (req, res) => {
  dataStore.deleteClient(req.params.id);
  res.status(204).send();
});

export default router;
