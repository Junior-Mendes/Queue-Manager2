import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import plansRouter from "./plans";
import tenantsRouter from "./tenants";
import businessesRouter from "./businesses";
import servicesRouter from "./services";
import professionalsRouter from "./professionals";
import queuesRouter from "./queues";
import queueEntriesRouter from "./queueEntries";
import appointmentsRouter from "./appointments";
import tenantUsersRouter from "./tenantUsers";
import publicRouter from "./public";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(plansRouter);
router.use(tenantsRouter);
router.use(businessesRouter);
router.use(servicesRouter);
router.use(professionalsRouter);
router.use(queuesRouter);
router.use(queueEntriesRouter);
router.use(appointmentsRouter);
router.use(tenantUsersRouter);
router.use(publicRouter);
router.use(statsRouter);

export default router;
