import { mysqlTable, varchar, text, char } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = mysqlTable("clients", {
  id: char("id", { length: 12 }).primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().default(""),
  dob: varchar("dob", { length: 10 }),
  notes: text("notes"),
  allergies: text("allergies"),
  hairSpecs: text("hair_specs"),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true });
export const selectClientSchema = createSelectSchema(clientsTable);
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
