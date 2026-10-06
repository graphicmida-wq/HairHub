import { mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

// The salon's brands and categories (Impostazioni → Marche e categorie): the list
// to pick from, including entries no product or service uses yet. Products and
// services keep their brand/category as text. name_key is the normalised name
// (trimmed, lower case) compared byte by byte, so "Artego" and "Artègo" stay two.
export const catalogTagsTable = mysqlTable(
  "catalog_tags",
  {
    kind: varchar("kind", { length: 20 }).notNull(),
    nameKey: varchar("name_key", { length: 100 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.nameKey] })],
);
