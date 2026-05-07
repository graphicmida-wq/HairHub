import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import servicesRouter from "./services";
import productsRouter from "./products";
import staffRouter from "./staff";
import appointmentsRouter from "./appointments";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(servicesRouter);
router.use(productsRouter);
router.use(staffRouter);
router.use(appointmentsRouter);
router.use(settingsRouter);

export default router;
