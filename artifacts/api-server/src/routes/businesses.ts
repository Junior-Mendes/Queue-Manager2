import { Router } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListBusinessesResponse,
  CreateBusinessBody,
  GetBusinessParams,
  UpdateBusinessBody,
  DeleteBusinessParams,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireTenant } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.get("/businesses", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const businesses = await db.select().from(businessesTable).where(eq(businessesTable.tenantId, req.tenantId!));
    return res.json(z.array(ListBusinessesResponse).parse(businesses));
  } catch (err) { return next(err); }
});

router.post("/businesses", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const body = CreateBusinessBody.parse(req.body);
    const [business] = await db.insert(businessesTable).values({
      ...body,
      tenantId: req.tenantId!,
    }).returning();
    return res.status(201).json(business);
  } catch (err) { return next(err); }
});

router.get("/businesses/:id", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const params = GetBusinessParams.parse({ id: req.params.id });
    const business = await db.select().from(businessesTable)
      .where(and(eq(businessesTable.id, params.id), eq(businessesTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!business) return res.status(404).json({ error: "Not found" });
    return res.json(business);
  } catch (err) { return next(err); }
});

router.put("/businesses/:id", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const params = GetBusinessParams.parse({ id: req.params.id });
    const body = UpdateBusinessBody.parse(req.body);
    const existing = await db.select().from(businessesTable)
      .where(and(eq(businessesTable.id, params.id), eq(businessesTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [updated] = await db.update(businessesTable).set(body).where(eq(businessesTable.id, params.id)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.delete("/businesses/:id", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const params = DeleteBusinessParams.parse({ id: req.params.id });
    const existing = await db.select().from(businessesTable)
      .where(and(eq(businessesTable.id, params.id), eq(businessesTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    await db.delete(businessesTable).where(eq(businessesTable.id, params.id));
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
