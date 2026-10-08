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
  // Birthday wishes: when they were sent, the promotion promised then, until when it holds, when it was used
  birthdayGreetedAt: varchar("birthday_greeted_at", { length: 40 }),
  birthdayPromo: text("birthday_promo"),
  birthdayPromoUntil: varchar("birthday_promo_until", { length: 10 }),
  birthdayPromoUsedAt: varchar("birthday_promo_used_at", { length: 40 }),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true });
export const selectClientSchema = createSelectSchema(clientsTable);
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
