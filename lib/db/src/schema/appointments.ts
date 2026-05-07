import { mysqlTable, varchar, text, char, int, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { servicesTable } from "./services";
import { staffMembersTable } from "./staff";

export const appointmentsTable = mysqlTable("appointments", {
  id: char("id", { length: 12 }).primaryKey(),
  clientId: char("client_id", { length: 12 }).notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  serviceId: char("service_id", { length: 12 }).notNull().references(() => servicesTable.id),
  staffId: char("staff_id", { length: 12 }).references(() => staffMembersTable.id, { onDelete: "set null" }),
  date: varchar("date", { length: 10 }).notNull(),
  time: varchar("time", { length: 5 }).notNull(),
  durationMins: int("duration_mins").notNull(),
  status: mysqlEnum("status", ["prenotato", "completato", "annullato", "no-show"]).notNull().default("prenotato"),
  notes: text("notes"),
  usedProductIds: json("used_product_ids").$type<string[]>(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true });
export const selectAppointmentSchema = createSelectSchema(appointmentsTable);
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
