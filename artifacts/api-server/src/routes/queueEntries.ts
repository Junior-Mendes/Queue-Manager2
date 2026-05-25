import { Router } from "express";
import { db } from "@workspace/db";
import { queuesTable, queueEntriesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import {
  ListQueueEntriesParams,
  ListQueueEntriesQueryParams,
  ListQueueEntriesResponse,
  JoinQueueBody,
  GetQueueEntryParams,
  UpdateQueueEntryStatusBody,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// Queue entries: tenant_admin, operator, or super_admin
router.get("/queues/:queueId/entries", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const params = ListQueueEntriesParams.parse({ queueId: req.params.queueId });
    const queue = await db.select().from(queuesTable).where(and(eq(queuesTable.id, params.queueId), eq(queuesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!queue) return res.status(404).json({ error: "Queue not found" });
    const query = ListQueueEntriesQueryParams.safeParse(req.query);
    let conditions: any = and(eq(queueEntriesTable.queueId, params.queueId), eq(queueEntriesTable.tenantId, req.tenantId!));
    if (query.success && query.data.status) {
      conditions = and(conditions, eq(queueEntriesTable.status, query.data.status as any));
    }
    const entries = await db.select().from(queueEntriesTable).where(conditions).orderBy(asc(queueEntriesTable.ticketNumber));
    return res.json(z.array(ListQueueEntriesResponse).parse(entries));
  } catch (err) { return next(err); }
});

// Anonymous clients can join queue (no auth)
router.post("/queues/:queueId/entries", async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const body = JoinQueueBody.parse(req.body);
    const queue = await db.select().from(queuesTable).where(eq(queuesTable.id, queueId)).then(r => r[0]);
    if (!queue) return res.status(404).json({ error: "Queue not found" });
    if (queue.status === "closed") return res.status(400).json({ error: "Queue is closed" });
    const ticketNumber = queue.lastTicket + 1;
    const [entry] = await db.insert(queueEntriesTable).values({
      ...body,
      queueId,
      tenantId: queue.tenantId,
      ticketNumber,
    }).returning();
    await db.update(queuesTable).set({ lastTicket: ticketNumber }).where(eq(queuesTable.id, queueId));
    return res.status(201).json(entry);
  } catch (err) { return next(err); }
});

router.get("/queues/:queueId/entries/:id", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await db.select().from(queueEntriesTable).where(and(eq(queueEntriesTable.id, id as string), eq(queueEntriesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!entry) return res.status(404).json({ error: "Not found" });
    return res.json(entry);
  } catch (err) { return next(err); }
});

router.patch("/queues/:queueId/entries/:id", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = UpdateQueueEntryStatusBody.parse(req.body);
    const entry = await db.select().from(queueEntriesTable).where(and(eq(queueEntriesTable.id, id as string), eq(queueEntriesTable.tenantId, req.tenantId!))).then(r => r[0]);
    if (!entry) return res.status(404).json({ error: "Not found" });
    const updateData: any = { status: body.status };
    if (body.status === "in_service") updateData.servedAt = new Date();
    if (body.status === "done") updateData.finishedAt = new Date();
    if (body.notes) updateData.notes = body.notes;
    const [updated] = await db.update(queueEntriesTable).set(updateData).where(eq(queueEntriesTable.id, id as string)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

export default router;
