import { Router } from "express";
import { db } from "@workspace/db";
import { queuesTable, queueEntriesTable, businessesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import {
  ListQueuesQueryParams,
  ListQueuesResponse,
  CreateQueueBody,
  GetQueueParams,
  UpdateQueueStatusBody,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// Queue management: tenant_admin, operator, or super_admin
router.get("/queues", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const query = ListQueuesQueryParams.safeParse(req.query);
    const businessId = query.success ? query.data.businessId : "";
    if (!businessId) return res.status(400).json({ error: "businessId required" });
    const conditions = and(
      eq(queuesTable.businessId, businessId as string),
      eq(queuesTable.tenantId, req.tenantId!),
    );
    const queues = await db.select().from(queuesTable).where(conditions);
    return res.json(queues);
  } catch (err) { return next(err); }
});

router.post("/queues", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const body = CreateQueueBody.parse(req.body);
    const business = await db.select().from(businessesTable).where(and(eq(businessesTable.id, body.businessId), eq(businessesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!business) return res.status(403).json({ error: "Business does not belong to tenant" });
    const [queue] = await db.insert(queuesTable).values({
      ...body,
      tenantId: req.tenantId!,
    }).returning();
    return res.status(201).json(queue);
  } catch (err) { return next(err); }
});

router.get("/queues/:id", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const params = GetQueueParams.parse({ id: req.params.id });
    const queue = await db.select().from(queuesTable).where(and(eq(queuesTable.id, params.id), eq(queuesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!queue) return res.status(404).json({ error: "Not found" });
    const entries = await db.select().from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.queueId, params.id), eq(queueEntriesTable.tenantId, req.tenantId!), eq(queueEntriesTable.status, "waiting")))
      .orderBy(asc(queueEntriesTable.ticketNumber));
    const enrichedEntries = entries.map((entry, idx) => ({
      ...entry,
      waitingAhead: idx,
      estimatedWaitMinutes: (idx + 1) * (queue.avgWaitMinutes || 15),
    }));
    return res.json({ ...queue, entries: enrichedEntries });
  } catch (err) { return next(err); }
});

router.patch("/queues/:id/status", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const params = GetQueueParams.parse({ id: req.params.id });
    const body = UpdateQueueStatusBody.parse(req.body);
    const existing = await db.select().from(queuesTable).where(and(eq(queuesTable.id, params.id), eq(queuesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const [updated] = await db.update(queuesTable).set({ status: body.status }).where(eq(queuesTable.id, params.id)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.post("/queues/:id/call-next", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const params = GetQueueParams.parse({ id: req.params.id });
    const queue = await db.select().from(queuesTable).where(and(eq(queuesTable.id, params.id), eq(queuesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!queue) return res.status(404).json({ error: "Not found" });
    const nextEntry = await db.select().from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.queueId, params.id), eq(queueEntriesTable.tenantId, req.tenantId!), eq(queueEntriesTable.status, "waiting")))
      .orderBy(asc(queueEntriesTable.ticketNumber))
      .limit(1)
      .then(r => r[0]);
    if (!nextEntry) return res.status(404).json({ error: "No waiting entries" });
    const [updated] = await db.update(queueEntriesTable).set({
      status: "called",
      calledAt: new Date(),
    }).where(eq(queueEntriesTable.id, nextEntry.id)).returning();
    await db.update(queuesTable).set({ currentTicket: nextEntry.ticketNumber }).where(eq(queuesTable.id, params.id));
    return res.json(updated);
  } catch (err) { return next(err); }
});

export default router;
