import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  dob: text("dob"),
  notes: text("notes"),
  allergies: text("allergies"),
  hairSpecs: text("hair_specs"),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  durationMins: integer("duration_mins").notNull(),
  price: real("price").notNull(),
  notes: text("notes"),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minThreshold: integer("min_threshold").notNull().default(5),
  supplier: text("supplier"),
  notes: text("notes"),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  durationMins: integer("duration_mins").notNull(),
  status: text("status", { enum: ["prenotato", "confermato", "completato", "annullato", "no-show"] }).notNull().default("prenotato"),
  notes: text("notes"),
  usedProductIds: text("used_product_ids"),
});

export const salonSettings = sqliteTable("salon_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  salonName: text("salon_name").notNull().default("L'Atelier"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type SalonSettings = typeof salonSettings.$inferSelect;
