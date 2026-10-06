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
import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";
import { hashPassword, assertAuthSecret } from "../lib/auth";

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

// better-sqlite3 (native) and its drizzle adapter are imported dynamically inside
// initSqlite() — and marked external in build.mjs — so they are NEVER loaded at
// startup in production (MySQL). This keeps the prod bundle free of the native
// better-sqlite3 dependency; only mysql2 (pure JS) is needed on the server.
import type BetterSqlite3 from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "./sqlite-schema";
import {
  clients as sqliteClients,
  services as sqliteServices,
  products as sqliteProducts,
  staffMembers as sqliteStaff,
  appointments as sqliteAppts,
  clientFormulas as sqliteFormulas,
  salonSettings as sqliteSalon,
  users as sqliteUsers,
  stockMovements as sqliteMovements,
  brandColors as sqliteBrandColors,
  catalogTags as sqliteCatalogTags,
  catalogSubcategories as sqliteCatalogSubs,
} from "./sqlite-schema";

type SqliteDb = BetterSQLite3Database<typeof sqliteSchema>;
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

function createSqliteTables(sqlite: BetterSqlite3.Database) {
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
      color TEXT NOT NULL DEFAULT '#94a3b8',
      duration_mins INTEGER NOT NULL,
      price REAL NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_threshold INTEGER NOT NULL DEFAULT 5,
      supplier TEXT,
      notes TEXT,
      unit_size REAL,
      unit_type TEXT,
      stock_grams REAL,
      subcategories TEXT
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
      service_ids TEXT NOT NULL DEFAULT '[]',
      service_prices TEXT,
      service_list_prices TEXT,
      sold_products TEXT,
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
      logo_url TEXT,
      show_salon_name INTEGER NOT NULL DEFAULT 1,
      address TEXT,
      phone TEXT,
      email TEXT,
      brand_color TEXT,
      background_color TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      name TEXT,
      created_at TEXT NOT NULL
    );
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_brand TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT,
      appointment_id TEXT,
      sale_id TEXT,
      note TEXT,
      user_id TEXT,
      user_name TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_appointment ON stock_movements(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_sale ON stock_movements(sale_id);
    CREATE TABLE IF NOT EXISTS brand_colors (
      brand TEXT PRIMARY KEY,
      color TEXT NOT NULL
    );
  `);
  // Migrations: no-op if column already present
  try { sqlite.exec("ALTER TABLE salon_settings ADD COLUMN brand_color TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE salon_settings ADD COLUMN background_color TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE salon_settings ADD COLUMN logo_url TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE salon_settings ADD COLUMN show_salon_name INTEGER NOT NULL DEFAULT 1"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN staff_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN used_products TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE services ADD COLUMN color TEXT NOT NULL DEFAULT '#94a3b8'"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN service_prices TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN service_list_prices TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("UPDATE appointments SET service_list_prices = service_prices WHERE service_list_prices IS NULL AND service_prices IS NOT NULL"); } catch { /* column may not exist yet */ }
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN sold_products TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN price REAL NOT NULL DEFAULT 0"); } catch { /* already exists */ }
  // serviceIds migration: add column, populate from service_id if present
  try { sqlite.exec("ALTER TABLE appointments ADD COLUMN service_ids TEXT NOT NULL DEFAULT '[]'"); } catch { /* already exists */ }
  try { sqlite.exec("UPDATE appointments SET service_ids = json_array(service_id) WHERE service_ids = '[]' AND service_id IS NOT NULL"); } catch { /* service_id column may not exist */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN unit_size REAL"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN unit_type TEXT"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN stock_grams REAL"); } catch { /* already exists */ }
  try { sqlite.exec("ALTER TABLE products ADD COLUMN subcategories TEXT"); } catch { /* already exists */ }
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
  const s1 = { id: uid(), name: "Taglio Donna", category: "Taglio", color: "#22c55e", durationMins: 45, price: 35, notes: null };
  const s2 = { id: uid(), name: "Piega Corti", category: "Piega", color: "#a855f7", durationMins: 30, price: 18, notes: null };
  const s3 = { id: uid(), name: "Colore Base", category: "Colore", color: "#f59e0b", durationMins: 90, price: 65, notes: "Include messa in piega" };
  const s4 = { id: uid(), name: "Taglio Uomo", category: "Taglio", color: "#0ea5e9", durationMins: 30, price: 20, notes: null };
  db.insert(sqliteServices).values([s1, s2, s3, s4]).run();
  const p1id = uid(); const p2id = uid(); const p3id = uid();
  db.insert(sqliteProducts).values([
    { id: p1id, name: "Shampoo Volumizzante", category: "Lavaggio", brand: "Kerastase", price: 18, quantity: 3, minThreshold: 5, supplier: null, notes: null, unitSize: 250, unitType: "ml" as const, stockGrams: 750 },
    { id: p2id, name: "Colore 7.0 Biondo", category: "Colore", brand: "Schwarzkopf", price: 12, quantity: 8, minThreshold: 3, supplier: null, notes: null, unitSize: 100, unitType: "g" as const, stockGrams: 800 },
    { id: p3id, name: "Maschera Idratante", category: "Finish", brand: "Loreal", price: 22, quantity: 2, minThreshold: 4, supplier: null, notes: null, unitSize: 200, unitType: "ml" as const, stockGrams: 400 },
  ]).run();
  db.insert(sqliteAppts).values([
    { id: uid(), clientId: c1.id, serviceIds: JSON.stringify([s3.id]), servicePrices: JSON.stringify([s3.price]), serviceListPrices: JSON.stringify([s3.price]), date: today, time: "10:00", durationMins: 90, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
    { id: uid(), clientId: c2.id, serviceIds: JSON.stringify([s4.id]), servicePrices: JSON.stringify([s4.price]), serviceListPrices: JSON.stringify([s4.price]), date: today, time: "11:15", durationMins: 30, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
    { id: uid(), clientId: c3.id, serviceIds: JSON.stringify([s1.id]), servicePrices: JSON.stringify([s1.price]), serviceListPrices: JSON.stringify([s1.price]), date: today, time: "14:00", durationMins: 45, status: "prenotato" as const, notes: null, usedProductIds: null, usedProducts: null },
  ]).run();
  db.insert(sqliteSalon).values({ salonName: "L'Atelier", address: null, phone: null, email: null }).run();
  logger.info("SQLite seed complete");
}

async function initSqlite() {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle: sqliteDrizzle } = await import("drizzle-orm/better-sqlite3");
  const dbPath = process.env["DB_FILE"] ?? path.join(process.cwd(), "dev.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _catalogIsNew = !sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'catalog_tags'").get();
  _subcategoriesAreNew = !sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'catalog_subcategories'").get();
  createSqliteTables(sqlite);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS catalog_tags (
      kind TEXT NOT NULL,
      name_key TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (kind, name_key)
    );
    CREATE TABLE IF NOT EXISTS catalog_subcategories (
      brand_key TEXT NOT NULL,
      category_key TEXT NOT NULL,
      name_key TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (brand_key, category_key, name_key)
    );
  `);
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
  const db = _mysqlDb;
  // Create every table on first boot so a fresh MySQL database (e.g. a brand-new
  // Netsons cPanel DB) works with no manual migration step. CREATE TABLE IF NOT
  // EXISTS is idempotent, so running this on every startup is safe. Tables are
  // created in foreign-key order (parents before children).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id CHAR(12) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(255) NOT NULL DEFAULT '',
      dob VARCHAR(10),
      notes TEXT,
      allergies TEXT,
      hair_specs TEXT
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS services (
      id CHAR(12) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      color VARCHAR(9) NOT NULL DEFAULT '#94a3b8',
      duration_mins INT NOT NULL,
      price DECIMAL(8,2) NOT NULL,
      notes TEXT
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id CHAR(12) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT '0',
      quantity INT NOT NULL DEFAULT 0,
      min_threshold INT NOT NULL DEFAULT 5,
      supplier VARCHAR(200),
      notes TEXT,
      unit_size DECIMAL(10,2),
      unit_type VARCHAR(2),
      stock_grams DECIMAL(10,2),
      subcategories JSON
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff_members (
      id CHAR(12) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(100),
      color VARCHAR(20) NOT NULL DEFAULT '#6b7280'
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id CHAR(12) PRIMARY KEY,
      client_id CHAR(12) NOT NULL,
      service_ids JSON NOT NULL,
      service_prices JSON,
      service_list_prices JSON,
      sold_products JSON,
      staff_id CHAR(12),
      date VARCHAR(10) NOT NULL,
      time VARCHAR(5) NOT NULL,
      duration_mins INT NOT NULL,
      status ENUM('prenotato','completato','annullato','no-show') NOT NULL DEFAULT 'prenotato',
      notes TEXT,
      used_product_ids JSON,
      used_products JSON,
      CONSTRAINT fk_appointments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_appointments_staff FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE SET NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS client_formulas (
      id CHAR(12) PRIMARY KEY,
      client_id CHAR(12) NOT NULL,
      name VARCHAR(200) NOT NULL,
      service_id CHAR(12),
      products JSON NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_formulas_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_formulas_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS salon_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      salon_name VARCHAR(200) NOT NULL DEFAULT 'L''Atelier',
      logo_url MEDIUMTEXT,
      show_salon_name INT NOT NULL DEFAULT 1,
      address VARCHAR(500),
      phone VARCHAR(30),
      email VARCHAR(255),
      brand_color VARCHAR(20),
      background_color VARCHAR(20)
    )
  `);
  // Widen logo_url on pre-existing tables (originally TEXT = 64KB, too small for a base64 logo).
  try { await db.execute(sql`ALTER TABLE salon_settings MODIFY logo_url MEDIUMTEXT`); } catch { /* already MEDIUMTEXT */ }
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(12) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','user') NOT NULL DEFAULT 'user',
      name VARCHAR(100),
      created_at VARCHAR(40) NOT NULL
    )
  `);
  // No foreign keys: the movement history must outlive deleted products,
  // clients and appointments (their names are snapshotted on each row).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id CHAR(12) PRIMARY KEY,
      product_id CHAR(12) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      product_brand VARCHAR(100) NOT NULL DEFAULT '',
      reason VARCHAR(30) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit VARCHAR(3) NOT NULL,
      unit_price DECIMAL(10,2),
      date VARCHAR(10) NOT NULL,
      time VARCHAR(5) NOT NULL,
      client_id CHAR(12),
      client_name VARCHAR(200),
      appointment_id CHAR(12),
      sale_id CHAR(12),
      note TEXT,
      user_id CHAR(12),
      user_name VARCHAR(100),
      created_at VARCHAR(40) NOT NULL,
      INDEX idx_stock_movements_date (date),
      INDEX idx_stock_movements_product (product_id),
      INDEX idx_stock_movements_appointment (appointment_id),
      INDEX idx_stock_movements_sale (sale_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS brand_colors (
      brand VARCHAR(100) PRIMARY KEY,
      color VARCHAR(9) NOT NULL
    )
  `);
  const catalogExists = await db.execute(sql`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'catalog_tags'
  `);
  _catalogIsNew = Number((catalogExists as unknown as [Array<{ n: number | string }>])[0]?.[0]?.n ?? 0) === 0;
  // utf8mb4_bin on the key: names are compared exactly as the app does
  // (an accent-insensitive collation would merge "Artego" and "Artègo")
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS catalog_tags (
      kind VARCHAR(20) NOT NULL,
      name_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      name VARCHAR(100) NOT NULL,
      PRIMARY KEY (kind, name_key)
    )
  `);
  const subcategoriesExist = await db.execute(sql`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'catalog_subcategories'
  `);
  _subcategoriesAreNew = Number((subcategoriesExist as unknown as [Array<{ n: number | string }>])[0]?.[0]?.n ?? 0) === 0;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS catalog_subcategories (
      brand_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      category_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      name_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      name VARCHAR(100) NOT NULL,
      PRIMARY KEY (brand_key, category_key, name_key)
    )
  `);

  // ── Schema migrations for pre-existing MySQL databases ─────────────────────
  // CREATE TABLE IF NOT EXISTS (above) covers brand-new databases and brand-new
  // *tables*, but it never adds newly-introduced *columns* to a table an older
  // build of the app already created (e.g. an existing Netsons salon DB upgraded
  // to a newer release). MySQL 8 has no "ADD COLUMN IF NOT EXISTS", so we attempt
  // each change and swallow the resulting duplicate-/unknown-column error when it
  // has already been applied. This mirrors the SQLite dev migrations so an
  // upgraded production DB ends up with exactly the same shape as a fresh one.
  const migrate = async (statement: string) => {
    try {
      await db.execute(sql.raw(statement));
    } catch (err) {
      // 1060 = ER_DUP_FIELDNAME (column already added), 1054 = ER_BAD_FIELD_ERROR
      // (column doesn't exist — e.g. a legacy-only step running on a fresh DB),
      // 1091 = ER_CANT_DROP_FIELD_OR_KEY (dropping a column/FK that isn't there).
      // All are expected, idempotent no-ops. Anything else is a real failure and
      // must stay visible in production logs (pino's default level is "info").
      const errno = (err as { errno?: number }).errno;
      const expected = errno === 1060 || errno === 1054 || errno === 1091;
      if (expected) {
        logger.debug(
          { statement, err: (err as Error).message },
          "MySQL migration step skipped (already applied or not applicable)",
        );
      } else {
        logger.warn(
          { statement, err: (err as Error).message },
          "MySQL migration step failed unexpectedly",
        );
      }
    }
  };

  // clients
  await migrate("ALTER TABLE clients ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ''");
  await migrate("ALTER TABLE clients ADD COLUMN dob VARCHAR(10)");
  await migrate("ALTER TABLE clients ADD COLUMN notes TEXT");
  await migrate("ALTER TABLE clients ADD COLUMN allergies TEXT");
  await migrate("ALTER TABLE clients ADD COLUMN hair_specs TEXT");

  // services: per-service colour
  await migrate("ALTER TABLE services ADD COLUMN color VARCHAR(9) NOT NULL DEFAULT '#94a3b8'");

  // products: pricing + gram/ml stock tracking
  await migrate("ALTER TABLE products ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0");
  await migrate("ALTER TABLE products ADD COLUMN unit_size DECIMAL(10,2)");
  await migrate("ALTER TABLE products ADD COLUMN unit_type VARCHAR(2)");
  await migrate("ALTER TABLE products ADD COLUMN stock_grams DECIMAL(10,2)");
  await migrate("ALTER TABLE products ADD COLUMN subcategories JSON");

  // staff_members: role + colour
  await migrate("ALTER TABLE staff_members ADD COLUMN role VARCHAR(100)");
  await migrate("ALTER TABLE staff_members ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT '#6b7280'");

  // salon_settings: branding/contact fields
  await migrate("ALTER TABLE salon_settings ADD COLUMN logo_url MEDIUMTEXT");
  await migrate("ALTER TABLE salon_settings ADD COLUMN show_salon_name INT NOT NULL DEFAULT 1");
  await migrate("ALTER TABLE salon_settings ADD COLUMN address VARCHAR(500)");
  await migrate("ALTER TABLE salon_settings ADD COLUMN phone VARCHAR(30)");
  await migrate("ALTER TABLE salon_settings ADD COLUMN email VARCHAR(255)");
  await migrate("ALTER TABLE salon_settings ADD COLUMN brand_color VARCHAR(20)");
  await migrate("ALTER TABLE salon_settings ADD COLUMN background_color VARCHAR(20)");

  // appointments: the multi-service upgrade (single service_id → service_ids[])
  // plus staff assignment, pricing snapshots and product usage. This is the
  // change most likely to break INSERTs on an older DB, because the current code
  // no longer writes the legacy service_id column.
  await migrate("ALTER TABLE appointments ADD COLUMN service_ids JSON");
  await migrate("ALTER TABLE appointments ADD COLUMN service_prices JSON");
  await migrate("ALTER TABLE appointments ADD COLUMN service_list_prices JSON");
  await migrate("ALTER TABLE appointments ADD COLUMN sold_products JSON");
  await migrate("ALTER TABLE appointments ADD COLUMN staff_id CHAR(12)");
  await migrate("ALTER TABLE appointments ADD COLUMN used_product_ids JSON");
  await migrate("ALTER TABLE appointments ADD COLUMN used_products JSON");
  // Backfill the new array column from the legacy single value and guarantee it is
  // never NULL BEFORE we get rid of the old column.
  await migrate(
    "UPDATE appointments SET service_ids = JSON_ARRAY(service_id) WHERE (service_ids IS NULL OR JSON_LENGTH(service_ids) = 0) AND service_id IS NOT NULL",
  );
  await migrate("UPDATE appointments SET service_ids = JSON_ARRAY() WHERE service_ids IS NULL");

  // Heal legacy `appointments` tables created by older builds. Such tables can
  // carry columns the current model no longer writes — most importantly the old
  // `service_id` (originally NOT NULL with a foreign key to services), replaced
  // by service_ids[] (backfilled above). On those tables EVERY insert is rejected
  // with "Field 'X' doesn't have a default value", which is exactly the
  // "non posso salvare appuntamento" bug. An FK column can't be relaxed with
  // MODIFY (MySQL errno 1832), so the FK must be dropped first; its name is
  // auto-generated, so we look it up. We run this on a dedicated mysql2
  // connection (not drizzle's pooled execute) so the information_schema reads
  // have a guaranteed [rows, fields] shape and can't silently come back empty.
  // Fully idempotent: on a fresh DB nothing matches and every step no-ops.
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection({
      host: process.env["DB_HOST"],
      user: process.env["DB_USER"],
      password: process.env["DB_PASS"] ?? "",
      database: process.env["DB_NAME"],
      port: Number(process.env["DB_PORT"] ?? 3306),
    });
    try {
      // 1) Drop any foreign key still defined on service_id (name looked up live).
      const [fkRows] = await conn.query(
        `SELECT CONSTRAINT_NAME AS name
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'appointments'
           AND COLUMN_NAME = 'service_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      for (const row of fkRows as Array<{ name: string }>) {
        try {
          await conn.query(`ALTER TABLE appointments DROP FOREIGN KEY \`${row.name}\``);
          logger.info({ fk: row.name }, "Dropped legacy service_id foreign key");
        } catch (e) {
          logger.warn({ err: (e as Error).message, fk: row.name }, "Could not drop legacy FK");
        }
      }
      // 2) Drop the now-unconstrained legacy column outright (errno 1091 = already gone).
      try {
        await conn.query("ALTER TABLE appointments DROP COLUMN service_id");
        logger.info("Dropped legacy appointments.service_id column");
      } catch (e) {
        if ((e as { errno?: number }).errno !== 1091) {
          logger.warn({ err: (e as Error).message }, "Could not drop legacy service_id column");
        }
      }
      // 3) Relax any OTHER legacy NOT NULL / no-default column the code never
      //    writes anymore (e.g. an old single `price`), so an insert that omits
      //    it can't be rejected. Columns we do write are left untouched. Making a
      //    column nullable is safe and reversible; we never drop unknown data.
      const WRITTEN_COLS = new Set([
        "id", "client_id", "service_ids", "service_prices", "service_list_prices",
        "sold_products", "staff_id", "date", "time", "duration_mins", "status",
        "notes", "used_product_ids", "used_products",
      ]);
      const [colRows] = await conn.query(
        `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'appointments'
           AND IS_NULLABLE = 'NO'
           AND COLUMN_DEFAULT IS NULL
           AND COLUMN_KEY <> 'PRI'
           AND EXTRA NOT LIKE '%auto_increment%'`,
      );
      for (const col of colRows as Array<{ name: string; type: string }>) {
        if (WRITTEN_COLS.has(col.name)) continue;
        try {
          await conn.query(`ALTER TABLE appointments MODIFY \`${col.name}\` ${col.type} NULL`);
          logger.info({ col: col.name }, "Relaxed legacy NOT NULL appointments column");
        } catch (e) {
          logger.warn({ err: (e as Error).message, col: col.name }, "Could not relax legacy column");
        }
      }
    } finally {
      await conn.end();
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Legacy appointments heal step failed");
  }

  logger.info("MySQL database initialized (all tables ensured)");
}

async function mysqlSeedIfEmpty() {
  const { clientsTable, servicesTable, productsTable, appointmentsTable, salonSettingsTable } = await import("@workspace/db");
  const db = getMysqlDb();

  // Always ensure a salon_settings row exists — the login/branding screen reads it.
  const settingsRows = await db.select().from(salonSettingsTable).execute();
  if (settingsRows.length === 0) {
    await db.insert(salonSettingsTable).values({ salonName: "L'Atelier", address: null, phone: null, email: null });
  }

  // Demo business data (fake clients/services/products/appointments) is for
  // development only. A real production salon (Netsons MySQL) must start with an
  // empty book, so never insert demo records when NODE_ENV=production.
  if (process.env["NODE_ENV"] === "production") return;

  const existing = await db.select().from(clientsTable).execute();
  if (existing.length > 0) return;
  logger.info("Seeding MySQL database with demo data (development only)");
  const today = new Date().toISOString().split("T")[0]!;
  const c1id = uid(); const c2id = uid(); const c3id = uid();
  await db.insert(clientsTable).values([
    { id: c1id, firstName: "Giulia", lastName: "Bianchi", phone: "333 1234567", email: "giulia@example.com", dob: "1990-05-15", allergies: "Nickel", notes: null, hairSpecs: "Capelli ricci, colorazione semipermanente" },
    { id: c2id, firstName: "Marco", lastName: "Rossi", phone: "347 9876543", email: "marco@example.com", dob: null, allergies: null, notes: null, hairSpecs: null },
    { id: c3id, firstName: "Elena", lastName: "Conti", phone: "320 5551234", email: "elena@example.com", dob: "1985-11-22", allergies: "Ammoniaca", notes: "Preferisce prodotti bio", hairSpecs: null },
  ]);
  const s1id = uid(); const s2id = uid(); const s3id = uid(); const s4id = uid();
  await db.insert(servicesTable).values([
    { id: s1id, name: "Taglio Donna", category: "Taglio", color: "#22c55e", durationMins: 45, price: "35.00", notes: null },
    { id: s2id, name: "Piega Corti", category: "Piega", color: "#a855f7", durationMins: 30, price: "18.00", notes: null },
    { id: s3id, name: "Colore Base", category: "Colore", color: "#f59e0b", durationMins: 90, price: "65.00", notes: "Include messa in piega" },
    { id: s4id, name: "Taglio Uomo", category: "Taglio", color: "#0ea5e9", durationMins: 30, price: "20.00", notes: null },
  ]);
  await db.insert(productsTable).values([
    { id: uid(), name: "Shampoo Volumizzante", category: "Lavaggio", brand: "Kerastase", price: "18.00", quantity: 3, minThreshold: 5, supplier: null, notes: null, unitSize: "250.00", unitType: "ml", stockGrams: "750.00" },
    { id: uid(), name: "Colore 7.0 Biondo", category: "Colore", brand: "Schwarzkopf", price: "12.00", quantity: 8, minThreshold: 3, supplier: null, notes: null, unitSize: "100.00", unitType: "g", stockGrams: "800.00" },
    { id: uid(), name: "Maschera Idratante", category: "Finish", brand: "Loreal", price: "22.00", quantity: 2, minThreshold: 4, supplier: null, notes: null, unitSize: "200.00", unitType: "ml", stockGrams: "400.00" },
  ]);
  await db.insert(appointmentsTable).values([
    { id: uid(), clientId: c1id, serviceIds: [s3id], servicePrices: [65], serviceListPrices: [65], date: today, time: "10:00", durationMins: 90, status: "prenotato", notes: null, usedProductIds: null },
    { id: uid(), clientId: c2id, serviceIds: [s4id], servicePrices: [20], serviceListPrices: [20], date: today, time: "11:15", durationMins: 30, status: "prenotato", notes: null, usedProductIds: null },
    { id: uid(), clientId: c3id, serviceIds: [s1id], servicePrices: [35], serviceListPrices: [35], date: today, time: "14:00", durationMins: 45, status: "prenotato", notes: null, usedProductIds: null },
  ]);
  logger.info("MySQL demo seed complete");
}

// ── Init ───────────────────────────────────────────────────────────────────────

let _useMysql = false;
/** Set at start-up when the catalog_tags table had to be created (seeded once). */
let _catalogIsNew = false;
/** Same for catalog_subcategories (it may arrive after catalog_tags). */
let _subcategoriesAreNew = false;

/**
 * Seed an initial admin user when the users table is empty. Gated on
 * dbCountUsers() rather than the per-entity *SeedIfEmpty helpers, which bail out
 * once business data exists and would otherwise skip the admin in production.
 */
async function ensureAdminUser() {
  const count = await dbCountUsers();
  if (count > 0) return;
  const envUsername = process.env["ADMIN_USERNAME"]?.trim();
  const envPassword = process.env["ADMIN_PASSWORD"];
  const username = envUsername || "admin";
  const password = envPassword || "admin123";
  const usingDefaults = !envUsername || !envPassword;
  const passwordHash = await hashPassword(password);
  await dbCreateUser({ username, passwordHash, role: "admin", name: "Amministratore" });
  if (usingDefaults) {
    logger.warn(
      { username },
      "ADMIN_USERNAME/ADMIN_PASSWORD not set — seeded a DEFAULT admin (admin / admin123). CHANGE THIS PASSWORD immediately after first login!",
    );
  } else {
    logger.info({ username }, "Seeded initial admin user from ADMIN_USERNAME/ADMIN_PASSWORD");
  }
}

export async function initDb() {
  assertAuthSecret();
  if (process.env["DB_HOST"]) {
    _useMysql = true;
    await initMysql();
    await mysqlSeedIfEmpty();
  } else {
    _useMysql = false;
    await initSqlite();
  }
  await ensureAdminUser();
  if (_catalogIsNew) await seedCatalog();
  if (_subcategoriesAreNew) await seedSubcategories();
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

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export async function dbGetClientByPhone(phone: string) {
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return Promise.resolve(undefined);

  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    const db = getMysqlDb();
    const matchExpr = sql<string>`replace(replace(replace(replace(replace(replace(${clientsTable.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
    return db
      .select()
      .from(clientsTable)
      .where(eq(matchExpr, normalized))
      .limit(1)
      .execute()
      .then((r) => r[0]);
  }

  const matchExpr = sql<string>`replace(replace(replace(replace(replace(replace(${sqliteClients.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
  return Promise.resolve(
    getSqliteDb()
      .select()
      .from(sqliteClients)
      .where(eq(matchExpr, normalized))
      .limit(1)
      .all()[0],
  );
}

export async function dbSearchClients(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 20;
  // Every word must match somewhere, so "Gino Rossi" or "Rossi Gino" finds the client
  const words = q.split(/\s+/).map((w) => `%${w}%`);

  if (_useMysql) {
    const { clientsTable } = await import("@workspace/db");
    const db = getMysqlDb();
    return db
      .select()
      .from(clientsTable)
      .where(
        and(
          ...words.map((pattern) =>
            or(
              like(clientsTable.firstName, pattern),
              like(clientsTable.lastName, pattern),
              like(clientsTable.phone, pattern),
            ),
          ),
        ),
      )
      .orderBy(asc(clientsTable.lastName), asc(clientsTable.firstName))
      .limit(safeLimit)
      .execute();
  }

  return Promise.resolve(
    getSqliteDb()
      .select()
      .from(sqliteClients)
      .where(
        and(
          ...words.map((pattern) =>
            or(
              like(sqliteClients.firstName, pattern),
              like(sqliteClients.lastName, pattern),
              like(sqliteClients.phone, pattern),
            ),
          ),
        ),
      )
      .orderBy(asc(sqliteClients.lastName), asc(sqliteClients.firstName))
      .limit(safeLimit)
      .all(),
  );
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
    if (data.color !== undefined) mysqlPatch.color = data.color;
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

function getTrackedQuantity(
  quantity: number,
  unitSize: number | null,
  stockGrams: number | null,
): number {
  if (unitSize != null && stockGrams != null && unitSize > 0) {
    return Math.max(0, Math.floor(stockGrams / unitSize));
  }
  return quantity;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  quantity: number;
  minThreshold: number;
  supplier: string | null;
  notes: string | null;
  unitSize: number | null;
  unitType: string | null;
  stockGrams: number | null;
  subcategories: string[];
}

/** Trimmed, no empties, no duplicates ignoring case (first spelling wins). */
function cleanSubcategories(list: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list ?? []) {
    const text = raw.trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      out.push(text);
    }
  }
  return out;
}

type ProductWrite = Omit<typeof sqliteProducts.$inferInsert, "id" | "subcategories"> & { subcategories?: string[] | null };

function normalizeProduct(row: Record<string, unknown>): ProductRecord {
  const price = row["price"] != null ? Number(row["price"]) : 0;
  const unitSize = row["unitSize"] != null ? Number(row["unitSize"]) : null;
  const stockGrams = row["stockGrams"] != null ? Number(row["stockGrams"]) : null;
  const quantity = getTrackedQuantity(Number(row["quantity"] ?? 0), unitSize, stockGrams);

  return {
    ...row,
    price,
    quantity,
    unitSize,
    stockGrams,
    // SQLite keeps it as JSON text, MySQL may return it parsed or as text
    subcategories: coerceJson<string[]>(row["subcategories"]) ?? [],
  } as ProductRecord;
}

// Alphabetical, ignoring case/accents, with numbers by value ("Colore 7.0" before "Colore 10.0")
const productCollator = new Intl.Collator("it", { sensitivity: "base", numeric: true });
const byProductName = (a: ProductRecord, b: ProductRecord) =>
  productCollator.compare(a.name, b.name) || productCollator.compare(a.brand, b.brand);

export async function dbGetProducts() {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(productsTable).execute().then(rows => rows.map(normalizeProduct).sort(byProductName));
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteProducts).all().map(row => normalizeProduct(row)).sort(byProductName));
}

export async function dbGetProduct(id: string) {
  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      r[0] ? normalizeProduct(r[0] as Record<string, unknown>) : undefined
    );
  }
  const row = getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get();
  return Promise.resolve(row ? normalizeProduct(row) : undefined);
}

export async function dbCreateProduct(input: ProductWrite) {
  const id = uid();
  const { subcategories: rawSubcategories, ...data } = input;
  const subcategories = cleanSubcategories(rawSubcategories);
  // Auto-compute stockGrams if not provided and unitSize/quantity are present
  const stockGrams = data.stockGrams != null
    ? data.stockGrams
    : (data.unitSize != null ? (data.quantity ?? 0) * data.unitSize : null);
  const quantity = getTrackedQuantity(data.quantity ?? 0, data.unitSize ?? null, stockGrams);
  const productData = { ...data, quantity, stockGrams };

  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    const mysqlData = {
      ...productData,
      id,
      price: String((productData as { price?: number }).price ?? 0),
      unitSize: productData.unitSize != null ? String(productData.unitSize) : null,
      stockGrams: productData.stockGrams != null ? String(productData.stockGrams) : null,
      subcategories,
    };
    await getMysqlDb().insert(productsTable).values(mysqlData as typeof productsTable.$inferInsert);
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      normalizeProduct(r[0]! as Record<string, unknown>)
    );
  }
  getSqliteDb().insert(sqliteProducts).values({ ...productData, id, subcategories: JSON.stringify(subcategories) }).run();
  return Promise.resolve(normalizeProduct(getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get()!));
}

export async function dbUpdateProduct(id: string, input: Partial<ProductWrite>) {
  const { subcategories: rawSubcategories, ...data } = input;
  const existing = await dbGetProduct(id);
  if (!existing) {
    return undefined;
  }

  const unitSize = data.unitSize !== undefined ? data.unitSize : existing.unitSize;
  const stockGrams = data.stockGrams !== undefined ? data.stockGrams : existing.stockGrams;
  const normalizedData = { ...data };

  if (unitSize != null && stockGrams != null && unitSize > 0) {
    normalizedData.quantity = getTrackedQuantity(existing.quantity, unitSize, stockGrams);
  }

  if (_useMysql) {
    const { productsTable } = await import("@workspace/db");
    const mysqlPatch: Record<string, unknown> = { ...normalizedData };
    if (normalizedData.price !== undefined) mysqlPatch["price"] = normalizedData.price != null ? String(normalizedData.price) : "0";
    if (normalizedData.unitSize !== undefined) mysqlPatch["unitSize"] = normalizedData.unitSize != null ? String(normalizedData.unitSize) : null;
    if (normalizedData.stockGrams !== undefined) mysqlPatch["stockGrams"] = normalizedData.stockGrams != null ? String(normalizedData.stockGrams) : null;
    if (rawSubcategories !== undefined) mysqlPatch["subcategories"] = cleanSubcategories(rawSubcategories);
    await getMysqlDb().update(productsTable).set(mysqlPatch as Partial<typeof productsTable.$inferInsert>).where(eq(productsTable.id, id));
    return getMysqlDb().select().from(productsTable).where(eq(productsTable.id, id)).execute().then(r =>
      r[0] ? normalizeProduct(r[0] as Record<string, unknown>) : undefined
    );
  }
  getSqliteDb().update(sqliteProducts).set({
    ...normalizedData,
    ...(rawSubcategories !== undefined ? { subcategories: JSON.stringify(cleanSubcategories(rawSubcategories)) } : {}),
  }).where(eq(sqliteProducts.id, id)).run();
  const updated = getSqliteDb().select().from(sqliteProducts).where(eq(sqliteProducts.id, id)).get();
  return Promise.resolve(updated ? normalizeProduct(updated) : undefined);
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

// ── Users (auth) ─────────────────────────────────────────────────────────────

export type Role = "admin" | "user";

export interface CreateUserData {
  username: string;
  passwordHash: string;
  role: Role;
  name?: string | null;
}

export async function dbCountUsers(): Promise<number> {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    const rows = await getMysqlDb().select().from(usersTable).execute();
    return rows.length;
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).all().length);
}

export async function dbGetUsers() {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    return getMysqlDb().select().from(usersTable).execute();
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).all());
}

export async function dbGetUser(id: string) {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    return getMysqlDb().select().from(usersTable).where(eq(usersTable.id, id)).execute().then(r => r[0]);
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).where(eq(sqliteUsers.id, id)).get());
}

export async function dbGetUserByUsername(username: string) {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    return getMysqlDb().select().from(usersTable).where(eq(usersTable.username, username)).execute().then(r => r[0]);
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).where(eq(sqliteUsers.username, username)).get());
}

export async function dbCreateUser(data: CreateUserData) {
  const id = uid();
  const createdAt = new Date().toISOString();
  const values = {
    id,
    username: data.username,
    passwordHash: data.passwordHash,
    role: data.role,
    name: data.name ?? null,
    createdAt,
  };
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    await getMysqlDb().insert(usersTable).values(values);
    return getMysqlDb().select().from(usersTable).where(eq(usersTable.id, id)).execute().then(r => r[0]!);
  }
  getSqliteDb().insert(sqliteUsers).values(values).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).where(eq(sqliteUsers.id, id)).get()!);
}

export async function dbUpdateUser(
  id: string,
  data: Partial<{ username: string; passwordHash: string; role: Role; name: string | null }>,
) {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    await getMysqlDb().update(usersTable).set(data).where(eq(usersTable.id, id));
    return getMysqlDb().select().from(usersTable).where(eq(usersTable.id, id)).execute().then(r => r[0]);
  }
  getSqliteDb().update(sqliteUsers).set(data).where(eq(sqliteUsers.id, id)).run();
  return Promise.resolve(getSqliteDb().select().from(sqliteUsers).where(eq(sqliteUsers.id, id)).get());
}

export async function dbDeleteUser(id: string) {
  if (_useMysql) {
    const { usersTable } = await import("@workspace/db");
    await getMysqlDb().delete(usersTable).where(eq(usersTable.id, id));
    return;
  }
  getSqliteDb().delete(sqliteUsers).where(eq(sqliteUsers.id, id)).run();
}

// ── Appointments ───────────────────────────────────────────────────────────────

// Legacy MySQL tables (created by older builds) can store the appointment JSON
// columns as TEXT instead of a real JSON type, so mysql2 returns them as raw
// strings rather than parsed arrays. drizzle-orm's MySqlJson defines no
// mapFromDriverValue, so it passes that value straight through; Zod then rejects
// the response ("array expected, string received") and the save surfaces as a
// generic 500. Coerce every JSON-ish field defensively: parse it if it is a
// string, keep it as-is if mysql2 already parsed it to an array/object.
function coerceJson<T>(v: unknown): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    try { return JSON.parse(s) as T; } catch { return null; }
  }
  return v as T;
}

function normalizeApptRowMysql<T extends {
  serviceIds: unknown;
  servicePrices: unknown;
  serviceListPrices: unknown;
  soldProducts: unknown;
  usedProductIds: unknown;
  usedProducts: unknown;
}>(a: T) {
  return {
    ...a,
    serviceIds: coerceJson<string[]>(a.serviceIds) ?? [],
    servicePrices: coerceJson<number[]>(a.servicePrices),
    serviceListPrices: coerceJson<number[]>(a.serviceListPrices),
    soldProducts: coerceJson<{ productId: string; quantity: number; unitPrice: number }[]>(a.soldProducts),
    usedProductIds: coerceJson<string[]>(a.usedProductIds),
    usedProducts: coerceJson<UsedProductEntry[]>(a.usedProducts),
  };
}

// Same legacy-JSON-as-TEXT defense as normalizeApptRowMysql, for client formulas:
// the `products` column may come back from mysql2 as a raw string on older tables.
function normalizeFormulaRowMysql<T extends { products: unknown; createdAt: unknown }>(f: T) {
  return {
    ...f,
    products: coerceJson<FormulaProduct[]>(f.products) ?? [],
    createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
  };
}

function parseApptRow(a: typeof sqliteAppts.$inferSelect) {
  return {
    ...a,
    serviceIds: parseJson<string[]>(a.serviceIds) ?? [],
    servicePrices: parseJson<number[]>(a.servicePrices),
    serviceListPrices: parseJson<number[]>(a.serviceListPrices),
    soldProducts: parseJson<{ productId: string; quantity: number; unitPrice: number }[]>(a.soldProducts),
    usedProductIds: parseJson<string[]>(a.usedProductIds),
    usedProducts: parseJson<UsedProductEntry[]>(a.usedProducts),
  };
}

export async function dbGetAppointments() {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    const rows = await getMysqlDb().select().from(appointmentsTable).execute();
    return rows.map(normalizeApptRowMysql);
  }
  return Promise.resolve(
    getSqliteDb().select().from(sqliteAppts).all().map(parseApptRow)
  );
}

export async function dbGetAppointment(id: string) {
  if (_useMysql) {
    const { appointmentsTable } = await import("@workspace/db");
    const r = await getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute();
    return r[0] ? normalizeApptRowMysql(r[0]) : undefined;
  }
  const a = getSqliteDb().select().from(sqliteAppts).where(eq(sqliteAppts.id, id)).get();
  if (!a) return Promise.resolve(undefined);
  return Promise.resolve(parseApptRow(a));
}

export async function dbCreateAppointment(data: {
  clientId: string;
  serviceIds: string[];
  servicePrices?: number[] | null;
  serviceListPrices?: number[] | null;
  soldProducts?: { productId: string; quantity: number; unitPrice: number }[] | null;
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
      serviceIds: data.serviceIds,
      servicePrices: data.servicePrices ?? null,
      serviceListPrices: data.serviceListPrices ?? null,
      soldProducts: data.soldProducts ?? null,
      staffId: data.staffId ?? null,
      date: data.date,
      time: data.time,
      durationMins: data.durationMins,
      status: data.status,
      notes: data.notes ?? null,
      usedProductIds: data.usedProductIds ?? null,
      usedProducts: data.usedProducts ?? null,
    });
    const r = await getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute();
    return normalizeApptRowMysql(r[0]!);
  }
  getSqliteDb().insert(sqliteAppts).values({
    id,
    clientId: data.clientId,
    serviceIds: JSON.stringify(data.serviceIds),
    servicePrices: serializeJson(data.servicePrices ?? null),
    serviceListPrices: serializeJson(data.serviceListPrices ?? null),
    soldProducts: serializeJson(data.soldProducts ?? null),
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
  serviceIds: string[];
  servicePrices: number[] | null;
  serviceListPrices: number[] | null;
  soldProducts: { productId: string; quantity: number; unitPrice: number }[] | null;
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
    if (data.serviceIds !== undefined) mysqlPatch.serviceIds = data.serviceIds;
    if (data.servicePrices !== undefined) (mysqlPatch as Record<string, unknown>)["servicePrices"] = data.servicePrices;
    if (data.serviceListPrices !== undefined) (mysqlPatch as Record<string, unknown>)["serviceListPrices"] = data.serviceListPrices;
    if (data.soldProducts !== undefined) (mysqlPatch as Record<string, unknown>)["soldProducts"] = data.soldProducts;
    if (data.staffId !== undefined) mysqlPatch.staffId = data.staffId;
    if (data.date !== undefined) mysqlPatch.date = data.date;
    if (data.time !== undefined) mysqlPatch.time = data.time;
    if (data.durationMins !== undefined) mysqlPatch.durationMins = data.durationMins;
    if (data.status !== undefined) mysqlPatch.status = data.status;
    if (data.notes !== undefined) mysqlPatch.notes = data.notes;
    if (data.usedProductIds !== undefined) mysqlPatch.usedProductIds = data.usedProductIds;
    if (data.usedProducts !== undefined) (mysqlPatch as Record<string, unknown>)["usedProducts"] = data.usedProducts;
    await getMysqlDb().update(appointmentsTable).set(mysqlPatch).where(eq(appointmentsTable.id, id));
    const r = await getMysqlDb().select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).execute();
    return r[0] ? normalizeApptRowMysql(r[0]) : undefined;
  }
  const sqlitePatch: Partial<typeof sqliteAppts.$inferInsert> = {};
  if (data.clientId !== undefined) sqlitePatch.clientId = data.clientId;
  if (data.serviceIds !== undefined) sqlitePatch.serviceIds = JSON.stringify(data.serviceIds);
  if (data.servicePrices !== undefined) sqlitePatch.servicePrices = serializeJson(data.servicePrices);
  if (data.serviceListPrices !== undefined) sqlitePatch.serviceListPrices = serializeJson(data.serviceListPrices);
  if (data.soldProducts !== undefined) sqlitePatch.soldProducts = serializeJson(data.soldProducts);
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

// ── Stock movements ────────────────────────────────────────────────────────────

export type StockReason =
  | "vendita"
  | "uso_servizio"
  | "rifornimento"
  | "giacenza_iniziale"
  | "reso"
  | "rettifica"
  | "danneggiato"
  | "altro";
export type StockUnit = "pz" | "g" | "ml";

export interface NewStockMovement {
  productId: string;
  productName: string;
  productBrand: string;
  reason: StockReason;
  quantity: number;
  unit: StockUnit;
  unitPrice?: number | null;
  date: string;
  time: string;
  clientId?: string | null;
  clientName?: string | null;
  appointmentId?: string | null;
  saleId?: string | null;
  note?: string | null;
  userId?: string | null;
  userName?: string | null;
}

export interface StockMovementFilter {
  from?: string;
  to?: string;
  productId?: string;
  clientId?: string;
  reason?: StockReason;
  appointmentId?: string;
  saleId?: string;
}

export function newId() {
  return uid();
}

function normalizeMovement(row: Record<string, unknown>) {
  return {
    ...row,
    quantity: Number(row["quantity"]),
    unitPrice: row["unitPrice"] != null ? Number(row["unitPrice"]) : null,
  } as typeof sqliteMovements.$inferSelect;
}

export async function dbInsertStockMovements(rows: NewStockMovement[]) {
  if (rows.length === 0) return [];
  const createdAt = new Date().toISOString();
  const values = rows.map(r => ({
    id: uid(),
    productId: r.productId,
    productName: r.productName,
    productBrand: r.productBrand,
    reason: r.reason,
    // Two decimals is what MySQL stores; rounding here keeps both backends equal
    quantity: Math.round(r.quantity * 100) / 100,
    unit: r.unit,
    unitPrice: r.unitPrice ?? null,
    date: r.date,
    time: r.time,
    clientId: r.clientId ?? null,
    clientName: r.clientName ?? null,
    appointmentId: r.appointmentId ?? null,
    saleId: r.saleId ?? null,
    note: r.note ?? null,
    userId: r.userId ?? null,
    userName: r.userName ?? null,
    createdAt,
  }));
  // In blocks: the first start-up imports the whole appointment history at once,
  // and one huge INSERT could exceed MySQL's max_allowed_packet.
  const CHUNK = 500;
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    if (_useMysql) {
      const { stockMovementsTable } = await import("@workspace/db");
      await getMysqlDb().insert(stockMovementsTable).values(chunk.map(v => ({
        ...v,
        quantity: String(v.quantity),
        unitPrice: v.unitPrice != null ? String(v.unitPrice) : null,
      })));
    } else {
      getSqliteDb().insert(sqliteMovements).values(chunk).run();
    }
  }
  return values;
}

export async function dbListStockMovements(filter: StockMovementFilter = {}) {
  if (_useMysql) {
    const { stockMovementsTable: t } = await import("@workspace/db");
    const conds: SQL[] = [];
    if (filter.from) conds.push(gte(t.date, filter.from));
    if (filter.to) conds.push(lte(t.date, filter.to));
    if (filter.productId) conds.push(eq(t.productId, filter.productId));
    if (filter.clientId) conds.push(eq(t.clientId, filter.clientId));
    if (filter.reason) conds.push(eq(t.reason, filter.reason));
    if (filter.appointmentId) conds.push(eq(t.appointmentId, filter.appointmentId));
    if (filter.saleId) conds.push(eq(t.saleId, filter.saleId));
    const rows = await getMysqlDb().select().from(t)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(t.date), desc(t.time), desc(t.createdAt))
      .execute();
    return rows.map(r => normalizeMovement(r as Record<string, unknown>));
  }
  const t = sqliteMovements;
  const conds: SQL[] = [];
  if (filter.from) conds.push(gte(t.date, filter.from));
  if (filter.to) conds.push(lte(t.date, filter.to));
  if (filter.productId) conds.push(eq(t.productId, filter.productId));
  if (filter.clientId) conds.push(eq(t.clientId, filter.clientId));
  if (filter.reason) conds.push(eq(t.reason, filter.reason));
  if (filter.appointmentId) conds.push(eq(t.appointmentId, filter.appointmentId));
  if (filter.saleId) conds.push(eq(t.saleId, filter.saleId));
  return Promise.resolve(
    getSqliteDb().select().from(t)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(t.date), desc(t.time), desc(t.createdAt))
      .all()
      .map(r => normalizeMovement(r as Record<string, unknown>)),
  );
}

export async function dbGetStockMovement(id: string) {
  if (_useMysql) {
    const { stockMovementsTable: t } = await import("@workspace/db");
    const rows = await getMysqlDb().select().from(t).where(eq(t.id, id)).execute();
    return rows[0] ? normalizeMovement(rows[0] as Record<string, unknown>) : undefined;
  }
  const row = getSqliteDb().select().from(sqliteMovements).where(eq(sqliteMovements.id, id)).get();
  return Promise.resolve(row ? normalizeMovement(row as Record<string, unknown>) : undefined);
}

/** Remove movements from the history (entered by mistake or for a test). */
export async function dbDeleteStockMovements(ids: string[]) {
  if (ids.length === 0) return;
  if (_useMysql) {
    const { stockMovementsTable: t } = await import("@workspace/db");
    await getMysqlDb().delete(t).where(inArray(t.id, ids));
    return;
  }
  getSqliteDb().delete(sqliteMovements).where(inArray(sqliteMovements.id, ids)).run();
}

/** Ids of every appointment that already has at least one movement. */
export async function dbGetAppointmentIdsWithMovements(): Promise<Set<string>> {
  if (_useMysql) {
    const { stockMovementsTable: t } = await import("@workspace/db");
    const rows = await getMysqlDb().selectDistinct({ id: t.appointmentId }).from(t)
      .where(isNotNull(t.appointmentId)).execute();
    return new Set(rows.map(r => r.id!));
  }
  const t = sqliteMovements;
  const rows = getSqliteDb().selectDistinct({ id: t.appointmentId }).from(t)
    .where(isNotNull(t.appointmentId)).all();
  return new Set(rows.map(r => r.id!));
}

/** Keep an appointment's movements on the appointment's current day and client. */
export async function dbUpdateAppointmentMovementsMeta(appointmentId: string, data: {
  date: string;
  time: string;
  clientId: string | null;
  clientName: string | null;
}) {
  if (_useMysql) {
    const { stockMovementsTable: t } = await import("@workspace/db");
    await getMysqlDb().update(t).set(data).where(eq(t.appointmentId, appointmentId));
    return;
  }
  getSqliteDb().update(sqliteMovements).set(data).where(eq(sqliteMovements.appointmentId, appointmentId)).run();
}

// ── Brand colours ──────────────────────────────────────────────────────────────

/** Same grouping as Magazzino: "Artego", "artego " and "ARTEGO" are one brand. */
export function brandKey(brand: string): string {
  return brand.trim().toLowerCase();
}

export async function dbGetBrandColors() {
  if (_useMysql) {
    const { brandColorsTable } = await import("@workspace/db");
    return getMysqlDb().select().from(brandColorsTable).execute();
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteBrandColors).all());
}

export async function dbSetBrandColor(brand: string, color: string | null) {
  const key = brandKey(brand);
  if (_useMysql) {
    const { brandColorsTable } = await import("@workspace/db");
    if (color == null) {
      await getMysqlDb().delete(brandColorsTable).where(eq(brandColorsTable.brand, key));
    } else {
      await getMysqlDb().insert(brandColorsTable).values({ brand: key, color }).onDuplicateKeyUpdate({ set: { color } });
    }
    return dbGetBrandColors();
  }
  if (color == null) {
    getSqliteDb().delete(sqliteBrandColors).where(eq(sqliteBrandColors.brand, key)).run();
  } else {
    getSqliteDb().insert(sqliteBrandColors).values({ brand: key, color })
      .onConflictDoUpdate({ target: sqliteBrandColors.brand, set: { color } }).run();
  }
  return dbGetBrandColors();
}

// ── Catalog: brands and categories ─────────────────────────────────────────────

export type CatalogKind = "brand" | "product_category" | "service_category";
export const CATALOG_KINDS: CatalogKind[] = ["brand", "product_category", "service_category"];

/** The categories the app always offered: the start of every salon's list. */
const BUILTIN_TAGS: Record<CatalogKind, string[]> = {
  brand: [],
  product_category: ["Lavaggio", "Colore", "Finish", "Trattamento", "Styling", "Altro"],
  service_category: ["Colore", "Piega", "Taglio", "Trattamento", "Styling", "Altro"],
};

export async function dbListCatalogTags(): Promise<{ kind: CatalogKind; nameKey: string; name: string }[]> {
  if (_useMysql) {
    const { catalogTagsTable } = await import("@workspace/db");
    return (await getMysqlDb().select().from(catalogTagsTable).execute()) as { kind: CatalogKind; nameKey: string; name: string }[];
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteCatalogTags).all() as { kind: CatalogKind; nameKey: string; name: string }[]);
}

/** Add the names that aren't in the list yet (existing ones are left as they are). */
export async function dbEnsureCatalogTags(kind: CatalogKind, names: string[]) {
  const rows = [...new Map(
    names.map(n => n.trim()).filter(Boolean).map(name => [brandKey(name), { kind, nameKey: brandKey(name), name }]),
  ).values()].filter(r => r.nameKey.length <= 100);
  if (rows.length === 0) return;
  if (_useMysql) {
    const { catalogTagsTable } = await import("@workspace/db");
    await getMysqlDb().insert(catalogTagsTable).ignore().values(rows);
    return;
  }
  getSqliteDb().insert(sqliteCatalogTags).values(rows).onConflictDoNothing().run();
}

/** Set the display name of an entry (adding it if missing). */
export async function dbPutCatalogTag(kind: CatalogKind, name: string) {
  const row = { kind, nameKey: brandKey(name), name: name.trim() };
  if (_useMysql) {
    const { catalogTagsTable } = await import("@workspace/db");
    await getMysqlDb().insert(catalogTagsTable).values(row).onDuplicateKeyUpdate({ set: { name: row.name } });
    return;
  }
  getSqliteDb().insert(sqliteCatalogTags).values(row)
    .onConflictDoUpdate({ target: [sqliteCatalogTags.kind, sqliteCatalogTags.nameKey], set: { name: row.name } }).run();
}

export async function dbRemoveCatalogTag(kind: CatalogKind, nameKey: string) {
  if (_useMysql) {
    const { catalogTagsTable: t } = await import("@workspace/db");
    await getMysqlDb().delete(t).where(and(eq(t.kind, kind), eq(t.nameKey, nameKey)));
    return;
  }
  const t = sqliteCatalogTags;
  getSqliteDb().delete(t).where(and(eq(t.kind, kind), eq(t.nameKey, nameKey))).run();
}

/** Rewrite the brand snapshotted on these movements (a renamed or merged brand). */
export async function dbSetMovementsBrand(ids: string[], brand: string) {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    if (_useMysql) {
      const { stockMovementsTable: t } = await import("@workspace/db");
      await getMysqlDb().update(t).set({ productBrand: brand }).where(inArray(t.id, chunk));
    } else {
      getSqliteDb().update(sqliteMovements).set({ productBrand: brand }).where(inArray(sqliteMovements.id, chunk)).run();
    }
  }
}

/**
 * First start with the catalogue: the built-in categories plus every brand and
 * category already used by products and services, so nothing seems to vanish.
 */
async function seedCatalog() {
  try {
    const products = await dbGetProducts();
    const services = await dbGetServices();
    await dbEnsureCatalogTags("brand", products.map(p => p.brand));
    await dbEnsureCatalogTags("product_category", [...BUILTIN_TAGS.product_category, ...products.map(p => p.category)]);
    await dbEnsureCatalogTags("service_category", [...BUILTIN_TAGS.service_category, ...services.map(s => s.category)]);
    logger.info("Catalog of brands and categories created from existing products and services");
  } catch (err) {
    logger.error({ err }, "Could not seed the catalog of brands and categories");
  }
}

// ── Catalog: product sub-categories (per brand and category) ──────────────────

export interface SubcategoryTag {
  brandKey: string;
  categoryKey: string;
  nameKey: string;
  name: string;
}

export async function dbListSubcategoryTags(): Promise<SubcategoryTag[]> {
  if (_useMysql) {
    const { catalogSubcategoriesTable } = await import("@workspace/db");
    return getMysqlDb().select().from(catalogSubcategoriesTable).execute();
  }
  return Promise.resolve(getSqliteDb().select().from(sqliteCatalogSubs).all());
}

/** Add the sub-categories that aren't in the list yet (existing ones are left as they are). */
export async function dbEnsureSubcategoryTags(entries: { brand: string; category: string; name: string }[]) {
  const rows = [...new Map(
    entries
      .map(e => ({ brandKey: brandKey(e.brand), categoryKey: brandKey(e.category), nameKey: brandKey(e.name), name: e.name.trim() }))
      .filter(r => r.brandKey && r.categoryKey && r.nameKey)
      .filter(r => r.brandKey.length <= 100 && r.categoryKey.length <= 100 && r.nameKey.length <= 100)
      .map(r => [`${r.brandKey}\u0000${r.categoryKey}\u0000${r.nameKey}`, r]),
  ).values()];
  if (rows.length === 0) return;
  if (_useMysql) {
    const { catalogSubcategoriesTable } = await import("@workspace/db");
    await getMysqlDb().insert(catalogSubcategoriesTable).ignore().values(rows);
    return;
  }
  getSqliteDb().insert(sqliteCatalogSubs).values(rows).onConflictDoNothing().run();
}

/** Set the display name of a sub-category (adding it if missing). */
export async function dbPutSubcategoryTag(brand: string, category: string, name: string) {
  const row = { brandKey: brandKey(brand), categoryKey: brandKey(category), nameKey: brandKey(name), name: name.trim() };
  if (_useMysql) {
    const { catalogSubcategoriesTable } = await import("@workspace/db");
    await getMysqlDb().insert(catalogSubcategoriesTable).values(row).onDuplicateKeyUpdate({ set: { name: row.name } });
    return;
  }
  const t = sqliteCatalogSubs;
  getSqliteDb().insert(t).values(row)
    .onConflictDoUpdate({ target: [t.brandKey, t.categoryKey, t.nameKey], set: { name: row.name } }).run();
}

/** Remove sub-categories from the list: one, or every one of a brand or of a category. */
export async function dbRemoveSubcategoryTags(match: { brandKey?: string; categoryKey?: string; nameKey?: string }) {
  if (!match.brandKey && !match.categoryKey) return;
  if (_useMysql) {
    const { catalogSubcategoriesTable: t } = await import("@workspace/db");
    const conds: SQL[] = [];
    if (match.brandKey) conds.push(eq(t.brandKey, match.brandKey));
    if (match.categoryKey) conds.push(eq(t.categoryKey, match.categoryKey));
    if (match.nameKey) conds.push(eq(t.nameKey, match.nameKey));
    await getMysqlDb().delete(t).where(and(...conds));
    return;
  }
  const t = sqliteCatalogSubs;
  const conds: SQL[] = [];
  if (match.brandKey) conds.push(eq(t.brandKey, match.brandKey));
  if (match.categoryKey) conds.push(eq(t.categoryKey, match.categoryKey));
  if (match.nameKey) conds.push(eq(t.nameKey, match.nameKey));
  getSqliteDb().delete(t).where(and(...conds)).run();
}

/** First start with sub-categories in the list: every one already used by a product. */
async function seedSubcategories() {
  try {
    const products = await dbGetProducts();
    await dbEnsureSubcategoryTags(products.flatMap(p => (p.subcategories ?? []).map(name => ({ brand: p.brand, category: p.category, name }))));
    logger.info("Catalog of product sub-categories created from existing products");
  } catch (err) {
    logger.error({ err }, "Could not seed the catalog of sub-categories");
  }
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
    return rows.map(normalizeFormulaRowMysql);
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
      r[0] ? normalizeFormulaRowMysql(r[0]) : undefined
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
      await getMysqlDb().insert(salonSettingsTable).values({ salonName: "L'Atelier", showSalonName: 1 });
      row = await getMysqlDb().select().from(salonSettingsTable).execute().then(r => r[0]!);
    }
    return {
      ...row,
      showSalonName: row.showSalonName ? true : false,
      brandColor: normalizeBrandColor(row.brandColor),
    };
  }
  let s = getSqliteDb().select().from(sqliteSalon).get();
  if (!s) {
    getSqliteDb().insert(sqliteSalon).values({ salonName: "L'Atelier", showSalonName: 1 }).run();
    s = getSqliteDb().select().from(sqliteSalon).get()!;
  }
  return Promise.resolve({
    ...s,
    showSalonName: s.showSalonName ? true : false,
    brandColor: normalizeBrandColor(s.brandColor),
  });
}

// The retired default brand color (old purple "pergamena"). Treat it as "unset"
// so the current Blu Notte default palette applies instead of the legacy purple.
const LEGACY_DEFAULT_BRAND = "#5c5870";
function normalizeBrandColor(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase() === LEGACY_DEFAULT_BRAND ? null : value;
}

export async function dbUpdateSettings(data: Partial<{
  salonName: string;
  logoUrl: string | null;
  showSalonName: boolean | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  brandColor: string | null;
  backgroundColor: string | null;
}>) {
  const current = await dbGetSettings();
  if (_useMysql) {
    const { salonSettingsTable } = await import("@workspace/db");
    const patch: Partial<typeof salonSettingsTable.$inferInsert> = {};
    if (data.salonName !== undefined) patch.salonName = data.salonName;
    if (data.logoUrl !== undefined) patch.logoUrl = data.logoUrl;
    if (data.showSalonName !== undefined) patch.showSalonName = data.showSalonName ? 1 : 0;
    if (data.address !== undefined) patch.address = data.address;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.email !== undefined) patch.email = data.email;
    if (data.brandColor !== undefined) patch.brandColor = data.brandColor;
    if (data.backgroundColor !== undefined) patch.backgroundColor = data.backgroundColor;
    await getMysqlDb().update(salonSettingsTable).set(patch).where(eq(salonSettingsTable.id, current.id));
    return dbGetSettings();
  }
  const patch: Partial<typeof sqliteSalon.$inferInsert> = {};
  if (data.salonName !== undefined) patch.salonName = data.salonName;
  if (data.logoUrl !== undefined) patch.logoUrl = data.logoUrl;
  if (data.showSalonName !== undefined) patch.showSalonName = data.showSalonName ? 1 : 0;
  if (data.address !== undefined) patch.address = data.address;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.email !== undefined) patch.email = data.email;
  if (data.brandColor !== undefined) patch.brandColor = data.brandColor;
  if (data.backgroundColor !== undefined) patch.backgroundColor = data.backgroundColor;
  getSqliteDb().update(sqliteSalon).set(patch).where(eq(sqliteSalon.id, current.id)).run();
  return dbGetSettings();
}
