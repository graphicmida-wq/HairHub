import { mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

// Product sub-categories belong to a brand and a category (e.g. KERASTASE ·
// Lavaggio → "Capelli secchi"). Products keep them as a list of names; this is
// the salon's list (Impostazioni → Marche e categorie), with entries no product
// uses yet. The *_key columns are normalised names compared byte by byte.
export const catalogSubcategoriesTable = mysqlTable(
  "catalog_subcategories",
  {
    brandKey: varchar("brand_key", { length: 100 }).notNull(),
    categoryKey: varchar("category_key", { length: 100 }).notNull(),
    nameKey: varchar("name_key", { length: 100 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.brandKey, t.categoryKey, t.nameKey] })],
);
