import { Router, type IRouter, type Response } from "express";
import {
  AddCatalogTagBody,
  DeleteCatalogTagBody,
  GetCatalogResponse,
  RenameCatalogTagBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import {
  addSubcategory, addTag, CatalogError, deleteSubcategory, deleteTag, getCatalog, renameSubcategory, renameTag,
} from "../lib/catalog";

const router: IRouter = Router();

async function sendCatalog(res: Response, status = 200) {
  res.status(status).json(GetCatalogResponse.parse(await getCatalog()));
}

function fail(res: Response, err: unknown, label: string, log: { error: (o: object, m: string) => void }) {
  if (err instanceof CatalogError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  log.error({ err }, `Error on ${label}`);
  res.status(500).json({ message: `Operazione non riuscita: ${(err as Error).message}` });
}

// Everyone: the product and service forms pick from it
router.get("/catalog", async (_req, res) => {
  await sendCatalog(res);
});

// Managing the list is for admins (Impostazioni)
router.post("/catalog/tags", requireAdmin, async (req, res) => {
  const body = AddCatalogTagBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  try {
    const { kind, name, brand, category } = body.data;
    if (kind === "subcategory") await addSubcategory(brand, category, name);
    else await addTag(kind, name);
    await sendCatalog(res, 201);
  } catch (err) {
    fail(res, err, "POST /catalog/tags", req.log);
  }
});

router.put("/catalog/tags", requireAdmin, async (req, res) => {
  const body = RenameCatalogTagBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  try {
    const { kind, from, to, brand, category } = body.data;
    if (kind === "subcategory") await renameSubcategory(brand, category, from, to);
    else await renameTag(kind, from, to);
    await sendCatalog(res);
  } catch (err) {
    fail(res, err, "PUT /catalog/tags", req.log);
  }
});

router.post("/catalog/tags/delete", requireAdmin, async (req, res) => {
  const body = DeleteCatalogTagBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  try {
    const { kind, name, moveTo, brand, category } = body.data;
    if (kind === "subcategory") await deleteSubcategory(brand, category, name);
    else await deleteTag(kind, name, moveTo);
    await sendCatalog(res);
  } catch (err) {
    fail(res, err, "POST /catalog/tags/delete", req.log);
  }
});

export default router;
