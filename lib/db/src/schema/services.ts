import { mysqlTable, varchar, text, char, int, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicesTable = mysqlTable("services", {
  id: char("id", { length: 12 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  durationMins: int("duration_mins").notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true });
export const selectServiceSchema = createSelectSchema(servicesTable);
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
