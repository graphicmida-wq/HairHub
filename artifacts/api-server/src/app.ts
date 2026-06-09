import express, { type Express } from "express";
import cors from "cors";
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
} else {
  if (isProduction) {
    logger.warn(
      "CORS_ORIGIN is not set; allowing all origins. " +
      "Set CORS_ORIGIN to restrict access (e.g. https://tuodominio.it)."
    );
  }
  corsOrigin = true;
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

export default app;
