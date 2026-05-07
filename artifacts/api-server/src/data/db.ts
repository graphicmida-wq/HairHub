/**
 * Unified async data layer.
 *
 * - Dev (no DB_HOST): SQLite via better-sqlite3 + drizzle-orm/better-sqlite3
 * - Prod (DB_HOST set): MySQL via @workspace/db (drizzle-orm/mysql2)
 *
 * All exported functions are async regardless of backend.
 */

import { randomBytes } from "crypto";
import path from "path";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

// ── Shared helpers ─────────────────────────────────────────────────────────────

export type ApptStatus = "prenotato" | "completato" | "annullato" | "no-show";
export type UnitType = "g" | "ml";

export interface UsedProductEntry {
  productId: string;
  quantityUsed: number;
}

export interface FormulaProduct {
  productId: string;
  quantity: number;
}

function uid() {
  return randomBytes(6).toString("hex");
}

// ── SQLite backend (dev) ───────────────────────────────────────────────────────

import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "./sqlite-schema";
import {
  clients as sqliteClients,
  services as sqliteServices,
  products as sqliteProducts,
  staffMembers as sqliteStaff,
  appointments as sqliteAppts,
  clientFormulas as sqliteFormulas,
  salonSettings as sqliteSalon,
} from "./sqlite-schema";

type SqliteDb = ReturnType<typeof sqliteDrizzle<typeof sqliteSchema>>;
let _sqliteDb: SqliteDb | null = null;

function getSqliteDb(): SqliteDb {
  if (!_sqliteDb) throw new Error("SQLite DB not initialized");
  return _sqliteDb;
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function serializeJson(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val) && val.length === 0) return null;
  return JSON.stringify(val);
}

function createSqliteTables(sqlite: InstanceType<typeof Database>) {
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
      notes TEXT,
      unit_size REAL,
      unit_type TEXT,
      stock_grams REAL
    );
    CREATE TABLE IF NOT EXISTS staff_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      color TEXT NOT NULL DEFAULT '#6b7280'
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id TEXT NOT NULL REFERENCES services(id),
      staff_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_mins INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'prenotato',
      notes TEXT,
      used_product_ids TEXT,
      used_products TEXT
    );
    CREATE TABLE IF NOT EXISTS client_formulas (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      service_id TEXT,
      products TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS salon_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salon_name TEXT NOT NULL DEFAULT 'L''Atelier',
      address TEXT,
      phone TEXT,
      email TEXT,
      brand_color TEXT
    );
  `);
  // Migrations: no-op if column already present
  try { sqlite.exec("ALTER TABLE salon_settings ADD COLUMN brand_color TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN staff_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN used_products TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN unit_size REAL"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN unit_type TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN stock_grams REAL"); } catch { /* already exists */ }
  try { sqlite.exec(`CREATE TABLE IF NOT EXISTS client_formulas (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_id TEXT,
    products TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  )`); } catch { /* already exists */ }
}

function seedSqliteIfEmpty(db: SqliteDb) {
  const existing = db.select().from(sqliteClients).all();
  if (existing.length > 0) return;
  logger.info("Seeding SQLite database with initial data");
  const today = new Date().toISOString().split("T")[0]!;
  const c1 = { id: uid(), firstName: "Giulia", lastName: "Bianchi", phone: "333 1234567", email: "giulia@example.com", dob: "1990-05-15", allergies: "Nickel", notes: null, hairSpecs: "Capelli ricci, colorazione semipermanente" };
  const c2 = { id: uid(), firstName: "Marco", lastName: "Rossi", phone: "347 9876543", email: "marco@example.com", dob: null, allergies: null, notes: null, hairSpecs: null };
  const c3 = { id: uid(), firstName: "Elena", lastName: "Conti", phone: "320 5551234", email: "elena@example.com", dob: "1985-11-22", allergies: "Ammoniaca", notes: "Preferisce prodotti bio", hairSpecs: null };
  db.insert(sqliteClients).values([c1, c2, c3]).run();
  const s1 = { id: uid(), name: "Taglio Donna", category: "Taglio", durationMins: 45, price: 35, notes: null };
  const s2 = { id: uid(), name: "Piega Corti", category: "Piega", durationMins: 30, price: 18, notes: null };
  const s3 = { id: uid(), name: "Colore Base", category: "Colore", durationMins: 90, price: 65, notes: "Include messa in piega" };
  const s4 = { id: uid(), name: "Taglio Uomo", category: "Taglio", durationMins: 30, price: 20, notes: null };
  db.insert(sqliteServices).values([s1, s2, s3, s4]).run();
  const p1id = uid(); const p2id = uid(); const p3id = uid();
  db.insert(sqliteProducts).values([
    { id: p1id, name: "Shampoo Volumizzante", category: "Lavaggio", brand: "Kerastase", quantity: 3, minThreshold: 5, supplier: null, notes: null, unitSize: 250, unitType: "ml" as const, stockGrams: 750 },
    { id: p2id, name: "Colore 7.0 Biondo", category: "Colore", brand: "Schwarzkopf", quantity: 8, minThreshold: 3, supplier: null, notes: null, unitSize: 100, unitType: "g" as const, stockGrams: 800 },
    { id: p3id, name: "Maschera Idratante", category: "Finish", brand: "Loreal", quantity: 2, minThreshold: 4, supplier: null, notes: null, unitSize: 200, unitType: "ml" as const, stockGrams: 400 },
  ]).run();
  db.insert(sqliteAppts).values([
    { id: uid(), clientId: c1.id, serviceId: s3.id, date: today, time: "10:00", durationMins: 90, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
    { id: uid(), clientId: c2.id, serviceId: s4.id, date: today, time: "11:15", durationMins: 30, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
    { id: uid(), clientId: c3.id, serviceId: s1.id, date: today, time: "14:00", durationMins: 45, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
  ]).run();
  db.insert(sqliteSalon).values({ salonName: "L'Atelier", address: null, phone: null, email: null }).run();
  logger.info("SQLite seed complete");
}

function initSqlite() {
  const dbPath = process.env["DB_FILE"] ?? path.join(process.cwd(), "dev.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  createSqliteTables(sqlite);
  _sqliteDb = sqliteDrizzle(sqlite, { schema: sqliteSchema });
  seedSqliteIfEmpty(_sqliteDb);
  logger.info({ path: dbPath }, "SQLite database initialized");
}

// ── MySQL backend (prod) ───────────────────────────────────────────────────────

import type { getDb as getDbType } from "@workspace/db";
type MysqlDb = Awaited<ReturnType<typeof getDbType>>;
let _mysqlDb: MysqlDb | null = null;

function getMysqlDb(): MysqlDb {
  if (!_mysqlDb) throw new Error("MySQL DB not initialized");
  return _mysqlDb;
}

async function initMysql() {
  const { getDb } = await import("@workspace/db");
  _mysqlDb = await getDb();
  logger.info("MySQL database initialized");
}

async function mysqlSeedIfEmpty() {
  const { clientsTable, servicesTable, productsTable, appointmentsTable, salonSettingsTable } = await import("@workspace/db");
  const db = getMysqlDb();
  const existing = await db.select().from(clientsTable).execute();
  if (existing.length > 0) return;
  logger.info("Seeding MySQL database with initial data");
  const today = new Date().toISOString().split("T")[0]!;
  const c1id = uid(); const c2id = uid(); const c3id = uid();
  await db.insert(clientsTable).values([
    { id: c1id, firstName: "Giulia", lastName: "Bianchi", phone: "333 1234567", email: "giulia@example.com", dob: "1990-05-15", allergies: "Nickel", notes: null, hairSpecs: "Capelli ricci, colorazione semipermanente" },
    { id: c2id, firstName: "Marco", lastName: "Rossi", phone: "347 9876543", email: "marco@example.com", dob: null, allergies: null, notes: null, hairSpecs: null },
    { id: c3id, firstName: "Elena", lastName: "Conti", phone: "320 5551234", email: "elena@example.com", dob: "1985-11-22", allergies: "Ammoniaca", notes: "Preferisce prodotti bio", hairSpecs: null },
  ]);
  const s1id = uid(); const s2id = uid(); const s3id = uid(); const s4id = uid();
  await db.insert(servicesTable).values([
    { id: s1id, name: "Taglio Donna", category: "Taglio", durationMins: 45, price: "35.00", notes: null },
    { id: s2id, name: "Piega Corti", category: "Piega", durationMins: 30, price: "18.00", notes: null },
    { id: s3id, name: "Colore Base", category: "Colore", durationMins: 90, price: "65.00", notes: "Include messa in piega" },
    { id: s4id, name: "Taglio Uomo", category: "Taglio", durationMins: 30, price: "20.00", notes: null },
  ]);
  await db.insert(productsTable).values([
    { id: uid(), name: "Shampoo Volumizzante", category: "Lavaggio", brand: "Kerastase", quantity: 3, minThreshold: 5, supplier: null, notes: null, unitSize: "250.00", unitType: "ml", stockGrams: "750.00" },
    { id: uid(), name: "Colore 7.0 Biondo", category: "Colore", brand: "Schwarzkopf", quantity: 8, minThreshold: 3, supplier: null, notes: null, unitSize: "100.00", unitType: "g", stockGrams: "800.00" },
    { id: uid(), name: "Maschera Idratante", category: "Finish", brand: "Loreal", quantity: 2, minThreshold: 4, supplier: null, notes: null, unitSize: "200.00", unitType: "ml", stockGrams: "400.00" },
  ]);
  await db.insert(appointmentsTable).values([
    { id: uid(), clientId: c1id, serviceId: s3id, date: today, time: "10:00", durationMins: 90, status: "prenotato", notes: null, usedProductIds: null },
    { id: uid(), clientId: c2id, serviceId: s4id, date: today, time: "11:15", durationMins: 30, status: "prenotato", notes: null, usedProductIds: null },
    { id: uid(), clientId: c3id, serviceId: s1id, date: today, time: "14:00", durationMins: 45, status: "prenotato", notes: null, usedProductIds: null },
  ]);
  await db.insert(salonSettingsTable).values({ salonName: "L'Atelier", address: null, phone: null, email: null });
  logger.info("MySQL seed complete");
}

// ── Init ───────────────────────────────────────────────────────────────────────

let _useMysql = false;

export async function initDb() {
  if (process.env["DB_HOST"]) {
    _useMysql = true;
    await initMysql();
    await mysqlSeedIfEmpty();
  } else {
    _useMysql = false;
    initSqlite();
  }
}

// ── Clients ────────────────────────────────────────────────────────────────────

export async function dbGetClients() {
  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(clientsTable).execute();
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteClients).all());
}

export async function dbGetClient(id: string) {
  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(clientsTable).where(eq(clientsTable.id, id)).execute().then(r => r[0]);
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteClients).where(eq(sqliteClients.id, id)).get());
}

export async function dbCreateClient(data: Omit<typeof sqliteClients.$inferInsert, "id">) {
  const id = uid();
  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    await getMysqlDb().insert(clientsTable).values({ ...data, id });
    return getMysqlDb().select().from(clientsTable).where(eq(clientsTable.id, id)).execute().then(r => r[0]!);
  }
  getSqliteDb().insert(sqliteClients).values({ ...data, id }).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteClients).where(eq(sqliteClients.id, id)).get()!);
}

export async function dbUpdateClient(id: string, data: Partial<Omit<typeof sqliteClients.$inferInsert, "id">>) {
  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    await getMysqlDb().update(clientsTable).set(data).where(eq(clientsTable.id, id));
    return getMysqlDb().select().from(clientsTable).where(eq(clientsTable.id, id)).execute().then(r => r[0]);
  }
  getSqliteDb().update(sqliteClients).set(data).where(eq(sqliteClients.id, id)).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteClients).where(eq(sqliteClients.id, id)).get());
}

export async function dbDeleteClient(id: string) {
  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    await getMysqlDb().delete(clientsTable).where(eq(clientsTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteClients).where(eq(sqliteClients.id, id)).run();
}

// ── Services ───────────────────────────────────────────────────────────────────

export async function dbGetServices() {
  if (_useMysql) {
    const { servicesTable } = await import("@workspace/db");
    return getMysqlDb().select().from(servicesTable).execute().then(rows =>
      rows.map(r => ({ ...r, price: Number(r.price) }))
    );
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteServices).all());
}

export async function dbGetService(id: string) {
  if (_useMysql) {
    const { servicesTable } = await import("@workspace/db");
    return getMysqlDb().select().from(servicesTable).where(eq(servicesTable.id, id)).execute().then(r =>
      r[0] ? { ...r[0], price: Number(r[0].price) } : undefined
    );
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteServices).where(eq(sqliteServices.id, id)).get());
}

export async function dbCreateService(data: Omit<typeof sqliteServices.$inferInsert, "id">) {
  const id = uid();
  if (_useMysql) {
    const { servicesTable } = await import("@workspace/db");
    await getMysqlDb().insert(servicesTable).values({ ...data, id, price: String(data.price) });
    return getMysqlDb().select().from(servicesTable).where(eq(servicesTable.id, id)).execute().then(r => ({ ...r[0]!, price: Number(r[0]!.price) }));
  }
  getSqliteDb().insert(sqliteServices).values({ ...data, id }).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteServices).where(eq(sqliteServices.id, id)).get()!);
}

export async function dbUpdateService(id: string, data: Partial<Omit<typeof sqliteServices.$inferInsert, "id">>) {
  if (_useMysql) {
    const { servicesTable } = await import("@workspace/db");
    const mysqlPatch: Partial<typeof servicesTable.$inferInsert> = {};
    if (data.name !== undefined) mysqlPatch.name = data.name;
    if (data.category !== undefined) mysqlPatch.category = data.category;
    if (data.durationMins !== undefined) mysqlPatch.durationMins = data.durationMins;
    if (data.price !== undefined) mysqlPatch.price = String(data.price);
    if (data.notes !== undefined) mysqlPatch.notes = data.notes;
    await getMysqlDb().update(servicesTable).set(mysqlPatch).where(eq(servicesTable.id, id));
    return getMysqlDb().select().from(servicesTable).where(eq(servicesTable.id, id)).execute().then(r =>
      r[0] ? { ...r[0], price: Number(r[0].price) } : undefined
    );
  }
  getSqliteDb().update(sqliteServices).set(data).where(eq(sqliteServices.id, id)).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteServices).where(eq(sqliteServices.id, id)).get());
}

export async function dbDeleteService(id: string) {
  if (_useMysql) {
    const { servicesTable } = await import("@workspace/db");
    await getMysqlDb().delete(servicesTable).where(eq(servicesTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteServices).where(eq(sqliteServices.id, id)).run();
}

// ── Products ───────────────────────────────────────────────────────────────────

function normalizeMysqlProduct(row: Record<string, unknown>) {
  return {
    ...row,
    unitSize: row["unitSize"] != null ? Number(row["unitSize"]) : null,
    stockGrams: row["stockGrams"] != null ? Number(row["stockGrams"]) : null,
  };
}

export async function dbGetProducts() {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(productsTable).execute().then(rows => rows.map(normalizeMysqlProduct));
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteProducts).all());
}

export async function dbGetProduct(id: string) {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      r[0] ? normalizeMysqlProduct(r[0] as Record<string, unknown>) : undefined
    );
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get());
}

export async function dbCreateProduct(data: Omit<typeof sqliteProducts.$inferInsert, "id">) {
  const id = uid();
  // Auto-compute stockGrams if not provided and unitSize/quantity are present
  const stockGrams = data.stockGrams != null
    ? data.stockGrams
    : (data.unitSize != null ? (data.quantity ?? 0) * data.unitSize : null);
  const productData = { ...data, stockGrams };

  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    const mysqlData = {
      ...productData,
      id,
      unitSize: productData.unitSize != null ? String(productData.unitSize) : null,
      stockGrams: productData.stockGrams != null ? String(productData.stockGrams) : null,
    };
    await getMysqlDb().insert(productsTable).values(mysqlData as typeof productsTable.$inferInsert);
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      normalizeMysqlProduct(r[0]! as Record<string, unknown>)
    );
  }
  getSqliteDb().insert(sqliteProducts).values({ ...productData, id }).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get()!);
}

export async function dbUpdateProduct(id: string, data: Partial<Omit<typeof sqliteProducts.$inferInsert, "id">>) {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    const mysqlPatch: Record<string, unknown> = { ...data };
    if (data.unitSize !== undefined) mysqlPatch["unitSize"] = data.unitSize != null ? String(data.unitSize) : null;
    if (data.stockGrams !== undefined) mysqlPatch["stockGrams"] = data.stockGrams != null ? String(data.stockGrams) : null;
    await getMysqlDb().update(productsTable).set(mysqlPatch as Partial<typeof productsTable.$inferInsert>).where(eq(productsTable.id, id));
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      r[0] ? normalizeMysqlProduct(r[0] as Record<string, unknown>) : undefined
    );
  }
  getSqliteDb().update(sqliteProducts).set(data).where(eq(sqliteProducts.id, id)).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get());
}

export async function dbDeleteProduct(id: string) {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    await getMysqlDb().delete(productsTable).where(eq(productsTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteProducts).where(eq(sqliteProducts.id, id)).run();
}

// ── Staff ──────────────────────────────────────────────────────────────────────

export async function dbGetStaff() {
  if (_useMysql) {
    const { staffMembersTable } = await import("@workspace/db");
    return getMysqlDb().select().from(staffMembersTable).execute();
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteStaff).all());
}

export async function dbGetStaffMember(id: string) {
  if (_useMysql) {
    const { staffMembersTable } = await import("@workspace/db");
    return getMysqlDb().select().from(staffMembersTable).where(eq(staffMembersTable.id, id)).execute().then(r => r[0]);
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteStaff).where(eq(sqliteStaff.id, id)).get());
}

export async function dbCreateStaffMember(data: Omit<typeof sqliteStaff.$inferInsert, "id">) {
  const id = uid();
  if (_useMysql) {
    const { staffMembersTable } = await import("@workspace/db");
    await getMysqlDb().insert(staffMembersTable).values({ ...data, id });
    return getMysqlDb().select().from(staffMembersTable).where(eq(staffMembersTable.id, id)).execute().then(r => r[0]!);
  }
  getSqliteDb().insert(sqliteStaff).values({ ...data, id }).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteStaff).where(eq(sqliteStaff.id, id)).get()!);
}

export async function dbUpdateStaffMember(id: string, data: Partial<Omit<typeof sqliteStaff.$inferInsert, "id">>) {
  if (_useMysql) {
    const { staffMembersTable } = await import("@workspace/db");
    await getMysqlDb().update(staffMembersTable).set(data).where(eq(staffMembersTable.id, id));
    return getMysqlDb().select().from(staffMembersTable).where(eq(staffMembersTable.id, id)).execute().then(r => r[0]);
  }
  getSqliteDb().update(sqliteStaff).set(data).where(eq(sqliteStaff.id, id)).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteStaff).where(eq(sqliteStaff.id, id)).get());
}

export async function dbDeleteStaffMember(id: string) {
  if (_useMysql) {
    const { staffMembersTable } = await import("@workspace/db");
    await getMysqlDb().delete(staffMembersTable).where(eq(staffMembersTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteStaff).where(eq(sqliteStaff.id, id)).run();
}

// ── Appointments ───────────────────────────────────────────────────────────────

function parseApptRow(a: typeof sqliteAppts.$inferSelect) {
  return {
    ...a,
    usedProductIds: parseJson<string[]>(a.usedProductIds),
    usedProducts: parseJson<UsedProductEntry[]>(a.usedProducts),
  };
}

export async function dbGetAppointments() {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(appointmentsTable).execute();
  }
  return Promise.resolve(
    getSqliteDb().select().from(sqliteAppts).all().map(parseApptRow)
  );
}

export async function dbGetAppointment(id: string) {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute().then(r => r[0]);
  }
  const a = getSqliteDb().select().from(sqliteAppts).where(eq(sqliteAppts.id, id)).get();
  if (!a) return Promise.resolve(undefined);
  return Promise.resolve(parseApptRow(a));
}

export async function dbCreateAppointment(data: {
  clientId: string;
  serviceId: string;
  staffId?: string | null;
  date: string;
  time: string;
  durationMins: number;
  status: ApptStatus;
  notes?: string | null;
  usedProductIds?: string[] | null;
  usedProducts?: UsedProductEntry[] | null;
}) {
  const id = uid();
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    await getMysqlDb().insert(appointmentsTable).values({
      id,
      clientId: data.clientId,
      serviceId: data.serviceId,
      staffId: data.staffId ?? null,
      date: data.date,
      time: data.time,
      durationMins: data.durationMins,
      status: data.status,
      notes: data.notes ?? null,
      usedProductIds: data.usedProductIds ?? null,
      usedProducts: data.usedProducts ?? null,
    });
    return getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute().then(r => r[0]!);
  }
  getSqliteDb().insert(sqliteAppts).values({
    id,
    clientId: data.clientId,
    serviceId: data.serviceId,
    staffId: data.staffId ?? null,
    date: data.date,
    time: data.time,
    durationMins: data.durationMins,
    status: data.status,
    notes: data.notes ?? null,
    usedProductIds: serializeJson(data.usedProductIds ?? null),
    usedProducts: serializeJson(data.usedProducts ?? null),
  }).run();
  return dbGetAppointment(id).then(a => a!);
}

export async function dbUpdateAppointment(id: string, data: Partial<{
  clientId: string;
  serviceId: string;
  staffId: string | null;
  date: string;
  time: string;
  durationMins: number;
  status: ApptStatus;
  notes: string | null;
  usedProductIds: string[] | null;
  usedProducts: UsedProductEntry[] | null;
}>) {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    const mysqlPatch: Partial<typeof appointmentsTable.$inferInsert> = {};
    if (data.clientId !== undefined) mysqlPatch.clientId = data.clientId;
    if (data.serviceId !== undefined) mysqlPatch.serviceId = data.serviceId;
    if (data.staffId !== undefined) mysqlPatch.staffId = data.staffId;
    if (data.date !== undefined) mysqlPatch.date = data.date;
    if (data.time !== undefined) mysqlPatch.time = data.time;
    if (data.durationMins !== undefined) mysqlPatch.durationMins = data.durationMins;
    if (data.status !== undefined) mysqlPatch.status = data.status;
    if (data.notes !== undefined) mysqlPatch.notes = data.notes;
    if (data.usedProductIds !== undefined) mysqlPatch.usedProductIds = data.usedProductIds;
    if (data.usedProducts !== undefined) (mysqlPatch as Record<string, unknown>)["usedProducts"] = data.usedProducts;
    await getMysqlDb().update(appointmentsTable).set(mysqlPatch).where(eq(appointmentsTable.id, id));
    return getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute().then(r => r[0]);
  }
  const sqlitePatch: Partial<typeof sqliteAppts.$inferInsert> = {};
  if (data.clientId !== undefined) sqlitePatch.clientId = data.clientId;
  if (data.serviceId !== undefined) sqlitePatch.serviceId = data.serviceId;
  if (data.staffId !== undefined) sqlitePatch.staffId = data.staffId;
  if (data.date !== undefined) sqlitePatch.date = data.date;
  if (data.time !== undefined) sqlitePatch.time = data.time;
  if (data.durationMins !== undefined) sqlitePatch.durationMins = data.durationMins;
  if (data.status !== undefined) sqlitePatch.status = data.status;
  if (data.notes !== undefined) sqlitePatch.notes = data.notes;
  if (data.usedProductIds !== undefined) sqlitePatch.usedProductIds = serializeJson(data.usedProductIds);
  if (data.usedProducts !== undefined) sqlitePatch.usedProducts = serializeJson(data.usedProducts);
  getSqliteDb().update(sqliteAppts).set(sqlitePatch).where(eq(sqliteAppts.id, id)).run();
  return dbGetAppointment(id);
}

export async function dbDeleteAppointment(id: string) {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    await getMysqlDb().delete(appointmentsTable).where(eq(appointmentsTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteAppts).where(eq(sqliteAppts.id, id)).run();
}

// ── Client Formulas ────────────────────────────────────────────────────────────

function parseFormulaRow(f: typeof sqliteFormulas.$inferSelect) {
  return {
    ...f,
    products: parseJson<FormulaProduct[]>(f.products) ?? [],
  };
}

export async function dbGetClientFormulas(clientId?: string) {
  if (_useMysql) {
    const { clientFormulasTable } = await import("@workspace/db");
    const rows = clientId
      ? await getMysqlDb().select().from(clientFormulasTable).where(eq(clientFormulasTable.clientId, clientId)).execute()
      : await getMysqlDb().select().from(clientFormulasTable).execute();
    return rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt) }));
  }
  const rows = clientId
    ? getSqliteDb().select().from(sqliteFormulas).where(eq(sqliteFormulas.clientId, clientId)).all()
    : getSqliteDb().select().from(sqliteFormulas).all();
  return Promise.resolve(rows.map(parseFormulaRow));
}

export async function dbGetClientFormula(id: string) {
  if (_useMysql) {
    const { clientFormulasTable } = await import("@workspace/db");
    return getMysqlDb().select().from(clientFormulasTable).where(eq(clientFormulasTable.id, id)).execute().then(r =>
      r[0] ? { ...r[0], createdAt: r[0].createdAt instanceof Date ? r[0].createdAt.toISOString() : String(r[0].createdAt) } : undefined
    );
  }
  const f = getSqliteDb().select().from(sqliteFormulas).where(eq(sqliteFormulas.id, id)).get();
  if (!f) return Promise.resolve(undefined);
  return Promise.resolve(parseFormulaRow(f));
}

export async function dbCreateClientFormula(data: {
  clientId: string;
  name: string;
  serviceId?: string | null;
  products: FormulaProduct[];
  notes?: string | null;
}) {
  const id = uid();
  const createdAt = new Date().toISOString();
  if (_useMysql) {
    const { clientFormulasTable } = await import("@workspace/db");
    await getMysqlDb().insert(clientFormulasTable).values({
      id,
      clientId: data.clientId,
      name: data.name,
      serviceId: data.serviceId ?? null,
      products: data.products,
      notes: data.notes ?? null,
    });
    return dbGetClientFormula(id).then(f => f!);
  }
  getSqliteDb().insert(sqliteFormulas).values({
    id,
    clientId: data.clientId,
    name: data.name,
    serviceId: data.serviceId ?? null,
    products: JSON.stringify(data.products),
    notes: data.notes ?? null,
    createdAt,
  }).run();
  return dbGetClientFormula(id).then(f => f!);
}

export async function dbUpdateClientFormula(id: string, data: Partial<{
  name: string;
  serviceId: string | null;
  products: FormulaProduct[];
  notes: string | null;
}>) {
  if (_useMysql) {
    const { clientFormulasTable } = await import("@workspace/db");
    const patch: Partial<typeof clientFormulasTable.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.serviceId !== undefined) patch.serviceId = data.serviceId;
    if (data.products !== undefined) patch.products = data.products;
    if (data.notes !== undefined) patch.notes = data.notes;
    await getMysqlDb().update(clientFormulasTable).set(patch).where(eq(clientFormulasTable.id, id));
    return dbGetClientFormula(id);
  }
  const patch: Partial<typeof sqliteFormulas.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.serviceId !== undefined) patch.serviceId = data.serviceId;
  if (data.products !== undefined) patch.products = JSON.stringify(data.products);
  if (data.notes !== undefined) patch.notes = data.notes;
  getSqliteDb().update(sqliteFormulas).set(patch).where(eq(sqliteFormulas.id, id)).run();
  return dbGetClientFormula(id);
}

export async function dbDeleteClientFormula(id: string) {
  if (_useMysql) {
    const { clientFormulasTable } = await import("@workspace/db");
    await getMysqlDb().delete(clientFormulasTable).where(eq(clientFormulasTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteFormulas).where(eq(sqliteFormulas.id, id)).run();
}

// ── Settings ───────────────────────────────────────────────────────────────────

export async function dbGetSettings() {
  if (_useMysql) {
    const { salonSettingsTable } = await import("@workspace/db");
    let row = await getMysqlDb().select().from(salonSettingsTable).execute().then(r => r[0]);
    if (!row) {
      await getMysqlDb().insert(salonSettingsTable).values({ salonName: "L'Atelier" });
      row = await getMysqlDb().select().from(salonSettingsTable).execute().then(r => r[0]!);
    }
    return row;
  }
  let s = getSqliteDb().select().from(sqliteSalon).get();
  if (!s) {
    getSqliteDb().insert(sqliteSalon).values({ salonName: "L'Atelier" }).run();
    s = getSqliteDb().select().from(sqliteSalon).get()!;
  }
  return Promise.resolve(s);
}

export async function dbUpdateSettings(data: Partial<Omit<typeof sqliteSalon.$inferInsert, "id">>) {
  const current = await dbGetSettings();
  if (_useMysql) {
    const { salonSettingsTable } = await import("@workspace/db");
    await getMysqlDb().update(salonSettingsTable).set(data).where(eq(salonSettingsTable.id, current.id));
    return dbGetSettings();
  }
  getSqliteDb().update(sqliteSalon).set(data).where(eq(sqliteSalon.id, current.id)).run();
  return dbGetSettings();
}
