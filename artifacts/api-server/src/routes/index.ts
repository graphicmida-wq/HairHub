import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import servicesRouter from "./services";
import productsRouter from "./products";
import staffRouter from "./staff";
import appointmentsRouter from "./appointments";
import settingsRouter from "./settings";
import clientFormulasRouter from "./client-formulas";
import usersRouter from "./users";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ── Public routes (no authentication required) ──────────────────────────────
router.use(healthRouter);
router.use(authRouter);
// GET /settings is public (salon branding is shown on the login screen). The
// PUT /settings handler guards itself with requireAuth + requireAdmin.
router.use(settingsRouter);

// ── Protected routes (valid session required) ───────────────────────────────
router.use(requireAuth);
router.use(clientsRouter);
router.use(servicesRouter);
router.use(productsRouter);
router.use(staffRouter);
router.use(appointmentsRouter);
router.use(clientFormulasRouter);
// User management is further restricted to admins inside its own router.
router.use(usersRouter);

export default router;
