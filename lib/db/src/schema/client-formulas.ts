import { mysqlTable, varchar, text, char, json, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { servicesTable } from "./services";

export const clientFormulasTable = mysqlTable("client_formulas", {
  id: char("id", { length: 12 }).primaryKey(),
  clientId: char("client_id", { length: 12 }).notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  serviceId: char("service_id", { length: 12 }).references(() => servicesTable.id, { onDelete: "set null" }),
  products: json("products").notNull().$type<{ productId: string; quantity: number }[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientFormulaSchema = createInsertSchema(clientFormulasTable).omit({ id: true });
export const selectClientFormulaSchema = createSelectSchema(clientFormulasTable);
export type InsertClientFormula = z.infer<typeof insertClientFormulaSchema>;
export type ClientFormula = typeof clientFormulasTable.$inferSelect;
