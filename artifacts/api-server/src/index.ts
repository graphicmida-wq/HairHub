import app from "./app";
import { logger } from "./lib/logger";
import { initDb } from "./data/db";
import { backfillAppointmentMovements } from "./lib/stock";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 3001;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

initDb()
  .then(async () => {
    // Not fatal: the app works without the imported history, and it retries next start.
    await backfillAppointmentMovements().catch((err: unknown) => {
      logger.error({ err }, "Could not backfill stock movements");
    });

    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err: unknown) => {
    logger.error({ err }, "Failed to initialize database");
    process.exit(1);
  });
