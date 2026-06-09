import { mysqlTable, varchar, int, text } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salonSettingsTable = mysqlTable("salon_settings", {
  id: int("id").primaryKey().autoincrement(),
  salonName: varchar("salon_name", { length: 200 }).notNull().default("L'Atelier"),
  logoUrl: text("logo_url"),
  showSalonName: int("show_salon_name").notNull().default(1),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  brandColor: varchar("brand_color", { length: 20 }),
});

export const insertSettingsSchema = createInsertSchema(salonSettingsTable).omit({ id: true });
export const selectSettingsSchema = createSelectSchema(salonSettingsTable);
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type SalonSettings = typeof salonSettingsTable.$inferSelect;
