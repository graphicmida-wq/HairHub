import { defineConfig } from "drizzle-kit";
import path from "path";

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASS ?? "";
const dbName = process.env.DB_NAME;
const dbPort = Number(process.env.DB_PORT ?? 3306);

if (!dbHost || !dbUser || !dbName) {
  throw new Error("DB_HOST, DB_USER, DB_NAME must be set for migrations. See DEPLOY.md for instructions.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql",
  dbCredentials: {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  },
});
