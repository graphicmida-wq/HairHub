import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
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

export default app;
