import { Router } from "express";
import { db } from "@workspace/db";
import { professionalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListProfessionalsResponse,
  CreateProfessionalBody,
  UpdateProfessionalBody,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireTenant } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

router.get("/businesses/:businessId/professionals", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const professionals = await db.select().from(professionalsTable)
      .where(and(eq(professionalsTable.businessId, businessId as string), eq(professionalsTable.tenantId, req.tenantId!)));
    return res.json(z.array(ListProfessionalsResponse).parse(professionals));
  } catch (err) { return next(err); }
});

router.post("/businesses/:businessId/professionals", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const body = CreateProfessionalBody.parse(req.body);
    const [professional] = await db.insert(professionalsTable).values({
      ...body,
      businessId: businessId as string,
      tenantId: req.tenantId!,
    }).returning();
    return res.status(201).json(professional);
  } catch (err) { return next(err); }
});

router.put("/businesses/:businessId/professionals/:id", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const { businessId, id } = req.params;
    const body = UpdateProfessionalBody.parse(req.body);
    const existing = await db.select().from(professionalsTable)
      .where(and(eq(professionalsTable.id, id as string), eq(professionalsTable.businessId, businessId as string), eq(professionalsTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [updated] = await db.update(professionalsTable).set(body).where(eq(professionalsTable.id, id as string)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.delete("/businesses/:businessId/professionals/:id", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const { businessId, id } = req.params;
    const existing = await db.select().from(professionalsTable)
      .where(and(eq(professionalsTable.id, id as string), eq(professionalsTable.businessId, businessId as string), eq(professionalsTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    await db.delete(professionalsTable).where(eq(professionalsTable.id, id as string));
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
