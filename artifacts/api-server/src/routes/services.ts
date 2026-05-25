import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, businessesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListServicesParams,
  ListServicesResponse,
  CreateServiceBody,
  UpdateServiceBody,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// Service CRUD: tenant_admin or super_admin only
router.get("/businesses/:businessId/services", requireAuth, loadUserContext, requireRole("tenant_admin", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const params = ListServicesParams.parse(req.params);
    const services = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.businessId, params.businessId as string), eq(servicesTable.tenantId, req.tenantId!)));
    return res.json(z.array(ListServicesResponse).parse(services));
  } catch (err) { return next(err); }
});

router.post("/businesses/:businessId/services", requireAuth, loadUserContext, requireRole("tenant_admin", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const business = await db.select().from(businessesTable).where(and(eq(businessesTable.id, businessId as string), eq(businessesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!business) return res.status(403).json({ error: "Business does not belong to tenant" });
    const body = CreateServiceBody.parse(req.body);
    const [service] = await db.insert(servicesTable).values({
      ...body,
      businessId: businessId as string,
      tenantId: req.tenantId!,
    }).returning();
    return res.status(201).json(service);
  } catch (err) { return next(err); }
});

router.put("/businesses/:businessId/services/:id", requireAuth, loadUserContext, requireRole("tenant_admin", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const { businessId, id } = req.params;
    const body = UpdateServiceBody.parse(req.body);
    const existing = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.id, id as string), eq(servicesTable.businessId, businessId as string), eq(servicesTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [updated] = await db.update(servicesTable).set(body).where(eq(servicesTable.id, id as string)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.delete("/businesses/:businessId/services/:id", requireAuth, loadUserContext, requireRole("tenant_admin", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const { businessId, id } = req.params;
    const existing = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.id, id as string), eq(servicesTable.businessId, businessId as string), eq(servicesTable.tenantId, req.tenantId!)))
      .then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    await db.delete(servicesTable).where(eq(servicesTable.id, id as string));
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
