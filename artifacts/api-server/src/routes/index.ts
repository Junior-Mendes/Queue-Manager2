import { Router, type IRouter } from "express";
import healthRouter from "./health";
import plansRouter from "./plans";
import tenantsRouter from "./tenants";
import businessesRouter from "./businesses";
import servicesRouter from "./services";
import professionalsRouter from "./professionals";
import queuesRouter from "./queues";
import queueEntriesRouter from "./queueEntries";
import appointmentsRouter from "./appointments";
import publicRouter from "./public";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plansRouter);
router.use(tenantsRouter);
router.use(businessesRouter);
router.use(servicesRouter);
router.use(professionalsRouter);
router.use(queuesRouter);
router.use(queueEntriesRouter);
router.use(appointmentsRouter);
router.use(publicRouter);
router.use(statsRouter);

export default router;
