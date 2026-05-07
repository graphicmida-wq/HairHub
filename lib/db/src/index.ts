import * as schema from "./schema";

export * from "./schema";

// MySQL connection — only activated when DB_HOST is configured (production on Netsons).
// In development (Replit) without MySQL, the API server uses its in-memory data store instead.
// To use with MySQL, set DB_HOST, DB_USER, DB_PASS, DB_NAME env vars and call getDb().
export async function getDb() {
  const { drizzle } = await import("drizzle-orm/mysql2");
  const mysql = await import("mysql2/promise");

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS ?? "";
  const database = process.env.DB_NAME;
  const port = Number(process.env.DB_PORT ?? 3306);

  if (!host || !user || !database) {
    throw new Error("DB_HOST, DB_USER, DB_NAME environment variables are required for MySQL connection.");
  }

  const pool = mysql.createPool({ host, user, password, database, port });
  return drizzle(pool, { schema, mode: "default" });
}
