import { mysqlTable, varchar, text, char, int, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = mysqlTable("products", {
  id: char("id", { length: 12 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: int("quantity").notNull().default(0),
  minThreshold: int("min_threshold").notNull().default(5),
  supplier: varchar("supplier", { length: 200 }),
  notes: text("notes"),
  unitSize: decimal("unit_size", { precision: 10, scale: 2 }),
  unitType: varchar("unit_type", { length: 2 }),
  stockGrams: decimal("stock_grams", { precision: 10, scale: 2 }),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export const selectProductSchema = createSelectSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
