/**
 * Brands and categories (Impostazioni → Marche e categorie). Products and services
 * keep their brand/category as text; the catalogue is the list to pick from, with
 * entries no product uses yet. Renaming or deleting an entry rewrites the products
 * or services that use it, so nothing is left with a name that no longer exists.
 */
import {
  brandKey,
  dbGetBrandColors,
  dbGetProducts,
  dbGetServices,
  dbListCatalogTags,
  dbListStockMovements,
  dbPutCatalogTag,
  dbRemoveCatalogTag,
  dbSetBrandColor,
  dbSetMovementsBrand,
  dbUpdateProduct,
  dbUpdateService,
  type CatalogKind,
} from "../data/db";

export class CatalogError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface Entry {
  name: string;
  count: number;
  color?: string | null;
}

/** Products (or services) and the value they carry for this kind. */
async function holders(kind: CatalogKind): Promise<{ id: string; value: string }[]> {
  if (kind === "service_category") return (await dbGetServices()).map(s => ({ id: s.id, value: s.category }));
  return (await dbGetProducts()).map(p => ({ id: p.id, value: kind === "brand" ? p.brand : p.category }));
}

const holderWord = (kind: CatalogKind, n: number) =>
  kind === "service_category" ? (n === 1 ? "servizio" : "servizi") : (n === 1 ? "prodotto" : "prodotti");

export async function getCatalog() {
  const tags = await dbListCatalogTags();
  const colors = new Map((await dbGetBrandColors()).map(c => [c.brand, c.color]));
  const build = async (kind: CatalogKind) => {
    const entries = new Map<string, Entry>();
    for (const t of tags) if (t.kind === kind) entries.set(t.nameKey, { name: t.name, count: 0 });
    // A value used by a product but missing from the list still shows up
    for (const h of await holders(kind)) {
      const key = brandKey(h.value);
      if (!key) continue;
      const entry = entries.get(key) ?? { name: h.value.trim(), count: 0 };
      entry.count += 1;
      entries.set(key, entry);
    }
    return [...entries]
      .map(([key, e]) => (kind === "brand" ? { ...e, color: colors.get(key) ?? null } : e))
      .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
  };
  return {
    brands: await build("brand"),
    productCategories: await build("product_category"),
    serviceCategories: await build("service_category"),
  };
}

function cleanName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new CatalogError(400, "Scrivi un nome");
  if (clean.length > 100) throw new CatalogError(400, "Nome troppo lungo (massimo 100 caratteri)");
  return clean;
}

export async function addTag(kind: CatalogKind, name: string) {
  const clean = cleanName(name);
  const catalog = await getCatalog();
  const list = kind === "brand" ? catalog.brands : kind === "product_category" ? catalog.productCategories : catalog.serviceCategories;
  const existing = list.find(e => brandKey(e.name) === brandKey(clean));
  if (existing) throw new CatalogError(409, `«${existing.name}» c'è già`);
  await dbPutCatalogTag(kind, clean);
}

/**
 * Rename an entry; renaming it to another existing entry merges the two. Products
 * (or services) follow; for a brand also its colour (on a merge the target keeps
 * its own) and the brand shown in the movement history.
 */
export async function renameTag(kind: CatalogKind, from: string, to: string): Promise<number> {
  const fromKey = brandKey(from);
  const toName = cleanName(to);
  const toKey = brandKey(toName);
  if (!fromKey) throw new CatalogError(400, "Voce da rinominare mancante");

  const moving = (await holders(kind)).filter(h => brandKey(h.value) === fromKey);
  for (const h of moving) {
    if (kind === "service_category") await dbUpdateService(h.id, { category: toName });
    else await dbUpdateProduct(h.id, kind === "brand" ? { brand: toName } : { category: toName });
  }
  if (kind === "brand") {
    const history = (await dbListStockMovements()).filter(m => brandKey(m.productBrand) === fromKey);
    await dbSetMovementsBrand(history.map(m => m.id), toName);
    if (fromKey !== toKey) {
      const colors = new Map((await dbGetBrandColors()).map(c => [c.brand, c.color]));
      const color = colors.get(fromKey);
      if (color && !colors.has(toKey)) await dbSetBrandColor(toName, color);
      if (color) await dbSetBrandColor(fromKey, null);
    }
  }
  if (fromKey !== toKey) await dbRemoveCatalogTag(kind, fromKey);
  await dbPutCatalogTag(kind, toName);
  return moving.length;
}

/** Delete an entry; the products (or services) still using it move to `moveTo` first. */
export async function deleteTag(kind: CatalogKind, name: string, moveTo?: string | null) {
  const key = brandKey(name);
  if (!key) throw new CatalogError(400, "Voce da eliminare mancante");
  const using = (await holders(kind)).filter(h => brandKey(h.value) === key).length;
  if (using > 0) {
    if (!moveTo?.trim()) {
      throw new CatalogError(409, `${using} ${holderWord(kind, using)} usano ancora «${name.trim()}»: scegli dove spostarli`);
    }
    if (brandKey(moveTo) === key) throw new CatalogError(400, "Scegli una voce diversa da quella da eliminare");
    await renameTag(kind, name, moveTo);
    return;
  }
  await dbRemoveCatalogTag(kind, key);
  if (kind === "brand") await dbSetBrandColor(key, null);
}
