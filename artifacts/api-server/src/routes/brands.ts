import { Router, type IRouter } from "express";
import { dbGetBrandColors, dbSetBrandColor } from "../data/db";
import { ListBrandColorsResponse, SetBrandColorBody } from "@workspace/api-zod";

const router: IRouter = Router();

const HEX_RE = /^#[0-9a-f]{6}$/i;

router.get("/brand-colors", async (req, res) => {
  const parsed = ListBrandColorsResponse.safeParse(await dbGetBrandColors());
  if (!parsed.success) {
    req.log.error({ err: parsed.error }, "Response schema mismatch on GET /brand-colors");
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  res.json(parsed.data);
});

router.put("/brand-colors", async (req, res) => {
  const body = SetBrandColorBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.issues[0]?.message ?? "Invalid request body" });
    return;
  }
  const { brand, color } = body.data;
  if (!brand.trim()) {
    res.status(400).json({ message: "Marca mancante" });
    return;
  }
  if (color != null && !HEX_RE.test(color)) {
    res.status(400).json({ message: "Colore non valido" });
    return;
  }
  const data = await dbSetBrandColor(brand, color ? color.toLowerCase() : null);
  res.json(ListBrandColorsResponse.parse(data));
});

export default router;
