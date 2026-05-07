import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomBytes } from "crypto";
import * as schema from "./sqlite-schema";
import { clients, services, products, appointments, salonSettings } from "./sqlite-schema";
import { eq } from "drizzle-orm";
import path from "path";
import { logger } from "../lib/logger";

const DB_PATH = process.env["DB_FILE"] ?? path.join(process.cwd(), "dev.db");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) throw new Error("Database not initialized. Call initDb() first.");
  return _db;
}

function uid() {
  return randomBytes(6).toString("hex");
}

function createTables(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      dob TEXT,
      notes TEXT,
      allergies TEXT,
      hair_specs TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_mins INTEGER NOT NULL,
      price REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_threshold INTEGER NOT NULL DEFAULT 5,
      supplier TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id TEXT NOT NULL REFERENCES services(id),
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_mins INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'prenotato',
      notes TEXT,
      used_product_ids TEXT
    );

    CREATE TABLE IF NOT EXISTS salon_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_name TEXT NOT NULL DEFAULT 'L''Atelier',
      address TEXT,
      phone TEXT,
      email TEXT
    );
  `);
}

function seedIfEmpty(db: ReturnType<typeof drizzle<typeof schema>>) {
  const existingClients = db.select().from(clients).all();
  if (existingClients.length > 0) return;

  logger.info("Seeding database with initial data");

  const today = new Date().toISOString().split("T")[0]!;

  const c1 = { id: uid(), firstName: "Giulia", lastName: "Bianchi", phone: "333 1234567", email: "giulia@example.com", dob: "1990-05-15", allergies: "Nickel", notes: null, hairSpecs: "Capelli ricci, colorazione semipermanente" };
  const c2 = { id: uid(), firstName: "Marco", lastName: "Rossi", phone: "347 9876543", email: "marco@example.com", dob: null, allergies: null, notes: null, hairSpecs: null };
  const c3 = { id: uid(), firstName: "Elena", lastName: "Conti", phone: "320 5551234", email: "elena@example.com", dob: "1985-11-22", allergies: "Ammoniaca", notes: "Preferisce prodotti bio", hairSpecs: null };

  db.insert(clients).values([c1, c2, c3]).run();

  const s1 = { id: uid(), name: "Taglio Donna", category: "Taglio", durationMins: 45, price: 35, notes: null };
  const s2 = { id: uid(), name: "Piega Corti", category: "Piega", durationMins: 30, price: 18, notes: null };
  const s3 = { id: uid(), name: "Colore Base", category: "Colore", durationMins: 90, price: 65, notes: "Include messa in piega" };
  const s4 = { id: uid(), name: "Taglio Uomo", category: "Taglio", durationMins: 30, price: 20, notes: null };

  db.insert(services).values([s1, s2, s3, s4]).run();

  db.insert(products).values([
    { id: uid(), name: "Shampoo Volumizzante", category: "Lavaggio", brand: "Kerastase", quantity: 3, minThreshold: 5, supplier: null, notes: null },
    { id: uid(), name: "Colore 7.0 Biondo", category: "Colore", brand: "Schwarzkopf", quantity: 8, minThreshold: 3, supplier: null, notes: null },
    { id: uid(), name: "Maschera Idratante", category: "Finish", brand: "Loreal", quantity: 2, minThreshold: 4, supplier: null, notes: null },
  ]).run();

  db.insert(appointments).values([
    { id: uid(), clientId: c1.id, serviceId: s3.id, date: today, time: "10:00", durationMins: 90, status: "confermato" as const, notes: null, usedProductIds: null },
    { id: uid(), clientId: c2.id, serviceId: s4.id, date: today, time: "11:15", durationMins: 30, status: "prenotato" as const, notes: null, usedProductIds: null },
    { id: uid(), clientId: c3.id, serviceId: s1.id, date: today, time: "14:00", durationMins: 45, status: "prenotato" as const, notes: null, usedProductIds: null },
  ]).run();

  db.insert(salonSettings).values({ salonName: "L'Atelier", address: null, phone: null, email: null }).run();

  logger.info("Database seeded successfully");
}

export function initDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  createTables(sqlite);
  _db = drizzle(sqlite, { schema });
  seedIfEmpty(_db);
  logger.info({ path: DB_PATH }, "SQLite database initialized");
  return _db;
}

// ── Repository helpers ────────────────────────────────────────────────────────

export function parseProductIds(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as string[]; } catch { return null; }
}

export function serializeProductIds(ids: string[] | null | undefined): string | null {
  if (!ids || ids.length === 0) return null;
  return JSON.stringify(ids);
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function dbGetClients() {
  return getDb().select().from(clients).all();
}

export function dbGetClient(id: string) {
  return getDb().select().from(clients).where(eq(clients.id, id)).get();
}

export function dbCreateClient(data: Omit<typeof clients.$inferInsert, "id">) {
  const id = uid();
  getDb().insert(clients).values({ ...data, id }).run();
  return getDb().select().from(clients).where(eq(clients.id, id)).get()!;
}

export function dbUpdateClient(id: string, data: Partial<Omit<typeof clients.$inferInsert, "id">>) {
  getDb().update(clients).set(data).where(eq(clients.id, id)).run();
  return getDb().select().from(clients).where(eq(clients.id, id)).get();
}

export function dbDeleteClient(id: string) {
  getDb().delete(clients).where(eq(clients.id, id)).run();
}

// ── Services ──────────────────────────────────────────────────────────────────

export function dbGetServices() {
  return getDb().select().from(services).all();
}

export function dbGetService(id: string) {
  return getDb().select().from(services).where(eq(services.id, id)).get();
}

export function dbCreateService(data: Omit<typeof services.$inferInsert, "id">) {
  const id = uid();
  getDb().insert(services).values({ ...data, id }).run();
  return getDb().select().from(services).where(eq(services.id, id)).get()!;
}

export function dbUpdateService(id: string, data: Partial<Omit<typeof services.$inferInsert, "id">>) {
  getDb().update(services).set(data).where(eq(services.id, id)).run();
  return getDb().select().from(services).where(eq(services.id, id)).get();
}

export function dbDeleteService(id: string) {
  getDb().delete(services).where(eq(services.id, id)).run();
}

// ── Products ──────────────────────────────────────────────────────────────────

export function dbGetProducts() {
  return getDb().select().from(products).all();
}

export function dbGetProduct(id: string) {
  return getDb().select().from(products).where(eq(products.id, id)).get();
}

export function dbCreateProduct(data: Omit<typeof products.$inferInsert, "id">) {
  const id = uid();
  getDb().insert(products).values({ ...data, id }).run();
  return getDb().select().from(products).where(eq(products.id, id)).get()!;
}

export function dbUpdateProduct(id: string, data: Partial<Omit<typeof products.$inferInsert, "id">>) {
  getDb().update(products).set(data).where(eq(products.id, id)).run();
  return getDb().select().from(products).where(eq(products.id, id)).get();
}

export function dbDeleteProduct(id: string) {
  getDb().delete(products).where(eq(products.id, id)).run();
}

// ── Appointments ──────────────────────────────────────────────────────────────

export function dbGetAppointments() {
  return getDb().select().from(appointments).all().map(a => ({
    ...a,
    usedProductIds: parseProductIds(a.usedProductIds),
  }));
}

export function dbGetAppointment(id: string) {
  const a = getDb().select().from(appointments).where(eq(appointments.id, id)).get();
  if (!a) return undefined;
  return { ...a, usedProductIds: parseProductIds(a.usedProductIds) };
}

type ApptStatus = "prenotato" | "confermato" | "completato" | "annullato" | "no-show";

export function dbCreateAppointment(data: {
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMins: number;
  status: ApptStatus;
  notes?: string | null;
  usedProductIds?: string[] | null;
}) {
  const id = uid();
  getDb().insert(appointments).values({
    id,
    clientId: data.clientId,
    serviceId: data.serviceId,
    date: data.date,
    time: data.time,
    durationMins: data.durationMins,
    status: data.status,
    notes: data.notes ?? null,
    usedProductIds: serializeProductIds(data.usedProductIds ?? null),
  }).run();
  return dbGetAppointment(id)!;
}

export function dbUpdateAppointment(id: string, data: Partial<{
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMins: number;
  status: ApptStatus;
  notes: string | null;
  usedProductIds: string[] | null;
}>) {
  const { usedProductIds, ...rest } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = { ...rest };
  if (usedProductIds !== undefined) {
    patch.usedProductIds = serializeProductIds(usedProductIds);
  }
  getDb().update(appointments).set(patch).where(eq(appointments.id, id)).run();
  return dbGetAppointment(id);
}

export function dbDeleteAppointment(id: string) {
  getDb().delete(appointments).where(eq(appointments.id, id)).run();
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function dbGetSettings() {
  let s = getDb().select().from(salonSettings).get();
  if (!s) {
    getDb().insert(salonSettings).values({ salonName: "L'Atelier" }).run();
    s = getDb().select().from(salonSettings).get()!;
  }
  return s;
}

export function dbUpdateSettings(data: Partial<Omit<typeof salonSettings.$inferInsert, "id">>) {
  const s = dbGetSettings();
  getDb().update(salonSettings).set(data).where(eq(salonSettings.id, s.id)).run();
  return dbGetSettings();
}
