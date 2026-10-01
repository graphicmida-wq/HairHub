import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

// Brands are free text on products; their colour is keyed by the normalised name
export const brandColorsTable = mysqlTable("brand_colors", {
  brand: varchar("brand", { length: 100 }).primaryKey(),
  color: varchar("color", { length: 9 }).notNull(),
});
