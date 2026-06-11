import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const corsOriginEnv = process.env["CORS_ORIGIN"];
const isProduction = process.env["NODE_ENV"] === "production";

let corsOrigin: cors.CorsOptions["origin"];
if (corsOriginEnv) {
  corsOrigin = corsOriginEnv.split(",").map((o) => o.trim());
} else if (isProduction) {
  // Secure default for the Netsons deploy: with credentials:true, reflecting all
  // origins would expose the session cookie cross-site. The documented setup keeps
  // frontend and API on the same domain (same-origin needs no CORS), so block
  // cross-origin by default and require CORS_ORIGIN to be explicit for split domains.
  logger.warn(
    "CORS_ORIGIN non impostato in produzione: le richieste cross-origin sono bloccate. " +
    "Imposta CORS_ORIGIN se frontend e API sono su domini diversi (es. https://tuodominio.it)."
  );
  corsOrigin = false;
} else {
  corsOrigin = true;
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

// ── Static frontend (single-app deploy, e.g. Netsons) ───────────────────────────
// When a built frontend is bundled next to the server (../public relative to the
// compiled bundle, or an explicit STATIC_DIR), serve it from THIS Node app so the
// whole product runs as ONE application: the API stays under /api and every other
// route returns the SPA entry (index.html). In Replit dev there is no ./public,
// so this stays API-only and Vite serves the UI separately.
const defaultStaticDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
);
const staticDir = process.env["STATIC_DIR"] ?? defaultStaticDir;
if (fs.existsSync(path.join(staticDir, "index.html"))) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
  logger.info({ staticDir }, "Serving static frontend (single-app mode)");
} else {
  logger.info(
    { staticDir },
    "No static frontend found — API-only mode (set STATIC_DIR to serve the UI here)",
  );
}

export default app;
