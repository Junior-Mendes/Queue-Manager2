import { Router } from "express";
import { db } from "@workspace/db";
import { plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListPlansResponse,
  CreatePlanBody,
  GetPlanParams,
  UpdatePlanBody,
  DeletePlanParams,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// Plans: super_admin only
router.get("/plans", requireAuth, loadUserContext, requireRole("super_admin"), async (_req, res, next) => {
  try {
    const plans = await db.select().from(plansTable);
    return res.json(z.array(ListPlansResponse).parse(plans));
  } catch (err) { return next(err); }
});

router.post("/plans", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const body = CreatePlanBody.parse(req.body);
    const [plan] = await db.insert(plansTable).values(body).returning();
    return res.status(201).json(plan);
  } catch (err) { return next(err); }
});

router.get("/plans/:id", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const params = GetPlanParams.parse({ id: req.params.id });
    const plan = await db.select().from(plansTable).where(eq(plansTable.id, params.id)).then(r => r[0]);
    if (!plan) return res.status(404).json({ error: "Not found" });
    return res.json(plan);
  } catch (err) { return next(err); }
});

router.put("/plans/:id", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const params = GetPlanParams.parse({ id: req.params.id });
    const body = CreatePlanBody.parse(req.body);
    const [plan] = await db.update(plansTable).set(body).where(eq(plansTable.id, params.id)).returning();
    if (!plan) return res.status(404).json({ error: "Not found" });
    return res.json(plan);
  } catch (err) { return next(err); }
});

router.delete("/plans/:id", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const params = DeletePlanParams.parse({ id: req.params.id });
    await db.delete(plansTable).where(eq(plansTable.id, params.id));
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
