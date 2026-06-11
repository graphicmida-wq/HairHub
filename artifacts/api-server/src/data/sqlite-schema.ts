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
  color: text("color").notNull().default("#94a3b8"),
  durationMins: integer("duration_mins").notNull(),
  price: real("price").notNull(),
  notes: text("notes"),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  price: real("price").notNull().default(0),
  quantity: integer("quantity").notNull().default(0),
  minThreshold: integer("min_threshold").notNull().default(5),
  supplier: text("supplier"),
  notes: text("notes"),
  unitSize: real("unit_size"),
  unitType: text("unit_type", { enum: ["g", "ml"] }),
  stockGrams: real("stock_grams"),
});

export const staffMembers = sqliteTable("staff_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  color: text("color").notNull().default("#6b7280"),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceIds: text("service_ids").notNull(),
  servicePrices: text("service_prices"),
  serviceListPrices: text("service_list_prices"),
  staffId: text("staff_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  durationMins: integer("duration_mins").notNull(),
  status: text("status", { enum: ["prenotato", "completato", "annullato", "no-show"] }).notNull().default("prenotato"),
  notes: text("notes"),
  usedProductIds: text("used_product_ids"),
  usedProducts: text("used_products"),
  soldProducts: text("sold_products"),
});

export const clientFormulas = sqliteTable("client_formulas", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  serviceId: text("service_id"),
  products: text("products").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  name: text("name"),
  createdAt: text("created_at").notNull(),
});

export const salonSettings = sqliteTable("salon_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  salonName: text("salon_name").notNull().default("L'Atelier"),
  logoUrl: text("logo_url"),
  showSalonName: integer("show_salon_name").notNull().default(1),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  brandColor: text("brand_color"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = typeof staffMembers.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type ClientFormula = typeof clientFormulas.$inferSelect;
export type InsertClientFormula = typeof clientFormulas.$inferInsert;
export type SalonSettings = typeof salonSettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
