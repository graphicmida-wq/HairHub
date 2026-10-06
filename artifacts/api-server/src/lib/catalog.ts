/**
 * Brands and categories (Impostazioni → Marche e categorie). Products and services
 * keep their brand/category as text; the catalogue is the list to pick from, with
 * entries no product uses yet. Renaming or deleting an entry rewrites the products
 * or services that use it, so nothing is left with a name that no longer exists.
 */
import {
  brandKey,
  dbEnsureSubcategoryTags,
  dbGetBrandColors,
  dbGetProducts,
  dbGetServices,
  dbListCatalogTags,
  dbListStockMovements,
  dbListSubcategoryTags,
  dbPutCatalogTag,
  dbPutSubcategoryTag,
  dbRemoveCatalogTag,
  dbRemoveSubcategoryTags,
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
  const brands = await build("brand");
  const productCategories = await build("product_category");
  return {
    brands,
    productCategories,
    serviceCategories: await build("service_category"),
    subcategories: await buildSubcategories(brands, productCategories),
  };
}

/** Every sub-category with its brand and category (display names) and how many products use it. */
async function buildSubcategories(brands: Entry[], categories: Entry[]) {
  const brandName = new Map(brands.map(b => [brandKey(b.name), b.name]));
  const categoryName = new Map(categories.map(c => [brandKey(c.name), c.name]));
  const entries = new Map<string, { brand: string; category: string; name: string; count: number }>();
  const id = (b: string, c: string, n: string) => `${b}\u0000${c}\u0000${n}`;
  for (const t of await dbListSubcategoryTags()) {
    entries.set(id(t.brandKey, t.categoryKey, t.nameKey), {
      brand: brandName.get(t.brandKey) ?? t.brandKey,
      category: categoryName.get(t.categoryKey) ?? t.categoryKey,
      name: t.name,
      count: 0,
    });
  }
  for (const p of await dbGetProducts()) {
    const b = brandKey(p.brand);
    const c = brandKey(p.category);
    if (!b || !c) continue;
    for (const sub of p.subcategories ?? []) {
      const key = id(b, c, brandKey(sub));
      const entry = entries.get(key) ?? { brand: brandName.get(b) ?? p.brand.trim(), category: categoryName.get(c) ?? p.category.trim(), name: sub.trim(), count: 0 };
      entry.count += 1;
      entries.set(key, entry);
    }
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, "it", { sensitivity: "base" });
  return [...entries.values()].sort((a, b) => cmp(a.brand, b.brand) || cmp(a.category, b.category) || cmp(a.name, b.name));
}

/** The sub-categories of a brand (or of a category) follow it when it is renamed or merged. */
async function moveSubcategoryTags(field: "brand" | "category", fromKey: string, toName: string) {
  const rows = (await dbListSubcategoryTags()).filter(r => (field === "brand" ? r.brandKey : r.categoryKey) === fromKey);
  if (rows.length === 0 || brandKey(toName) === fromKey) return;
  await dbEnsureSubcategoryTags(rows.map(r => ({
    brand: field === "brand" ? toName : r.brandKey,
    category: field === "category" ? toName : r.categoryKey,
    name: r.name,
  })));
  await dbRemoveSubcategoryTags(field === "brand" ? { brandKey: fromKey } : { categoryKey: fromKey });
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
  if (kind === "brand") await moveSubcategoryTags("brand", fromKey, toName);
  if (kind === "product_category") await moveSubcategoryTags("category", fromKey, toName);
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
  if (kind === "brand") {
    await dbSetBrandColor(key, null);
    await dbRemoveSubcategoryTags({ brandKey: key });
  }
  if (kind === "product_category") await dbRemoveSubcategoryTags({ categoryKey: key });
}

// ── Sub-categories ────────────────────────────────────────────────────────────

function cleanScope(brand: string | null | undefined, category: string | null | undefined) {
  const b = brand?.trim() ?? "";
  const c = category?.trim() ?? "";
  if (!b || !c) throw new CatalogError(400, "Scegli la marca e la categoria della sottocategoria");
  return { brand: b, category: c, bk: brandKey(b), ck: brandKey(c) };
}

/** Products of the brand and category, with the sub-category matched by key. */
async function productsInScope(bk: string, ck: string) {
  return (await dbGetProducts()).filter(p => brandKey(p.brand) === bk && brandKey(p.category) === ck);
}

export async function addSubcategory(brand: string | null | undefined, category: string | null | undefined, name: string) {
  const scope = cleanScope(brand, category);
  const clean = cleanName(name);
  const key = brandKey(clean);
  const inList = (await dbListSubcategoryTags()).find(t => t.brandKey === scope.bk && t.categoryKey === scope.ck && t.nameKey === key)?.name;
  const inUse = (await productsInScope(scope.bk, scope.ck)).flatMap(p => p.subcategories ?? []).find(s => brandKey(s) === key);
  const existing = inList ?? inUse;
  if (existing) throw new CatalogError(409, `«${existing.trim()}» c'è già in ${scope.brand.toUpperCase()} · ${scope.category}`);
  await dbPutSubcategoryTag(scope.brand, scope.category, clean);
}

/** Rename a sub-category within its brand and category; renaming it to another one merges them. */
export async function renameSubcategory(brand: string | null | undefined, category: string | null | undefined, from: string, to: string) {
  const scope = cleanScope(brand, category);
  const fromKey = brandKey(from);
  const toName = cleanName(to);
  const toKey = brandKey(toName);
  if (!fromKey) throw new CatalogError(400, "Sottocategoria da rinominare mancante");
  for (const p of await productsInScope(scope.bk, scope.ck)) {
    const subs = p.subcategories ?? [];
    if (!subs.some(s => brandKey(s) === fromKey)) continue;
    // Keep the product's order; a product that had both ends up with one
    const next: string[] = [];
    for (const s of subs) {
      const name = brandKey(s) === fromKey ? toName : s;
      if (!next.some(n => brandKey(n) === brandKey(name))) next.push(name);
    }
    await dbUpdateProduct(p.id, { subcategories: next });
  }
  if (fromKey !== toKey) await dbRemoveSubcategoryTags({ brandKey: scope.bk, categoryKey: scope.ck, nameKey: fromKey });
  await dbPutSubcategoryTag(scope.brand, scope.category, toName);
}

/** Delete a sub-category: it is taken off the products that had it (they stay as they are otherwise). */
export async function deleteSubcategory(brand: string | null | undefined, category: string | null | undefined, name: string) {
  const scope = cleanScope(brand, category);
  const key = brandKey(name);
  if (!key) throw new CatalogError(400, "Sottocategoria da eliminare mancante");
  for (const p of await productsInScope(scope.bk, scope.ck)) {
    const subs = p.subcategories ?? [];
    if (subs.some(s => brandKey(s) === key)) await dbUpdateProduct(p.id, { subcategories: subs.filter(s => brandKey(s) !== key) });
  }
  await dbRemoveSubcategoryTags({ brandKey: scope.bk, categoryKey: scope.ck, nameKey: key });
}
