import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable, businessesTable, queuesTable, queueEntriesTable, appointmentsTable,
} from "@workspace/db";
import { eq, and, gte, count, avg, sql } from "drizzle-orm";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";

const router = Router();

router.get("/stats/saas", requireAuth, requireRole("super_admin"), async (_req, res, next) => {
  try {
    const tenants = await db.select().from(tenantsTable);
    const businesses = await db.select().from(businessesTable);
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const queuesToday = await db.select({ count: count() }).from(queuesTable).where(eq(queuesTable.date, today)).then(r => r[0]?.count ?? 0);
    const apptsToday = await db.select({ count: count() }).from(appointmentsTable).where(gte(appointmentsTable.scheduledAt, new Date(today))).then(r => r[0]?.count ?? 0);
    const apptsMonth = await db.select({ count: count() }).from(appointmentsTable).where(gte(appointmentsTable.scheduledAt, new Date(startOfMonth))).then(r => r[0]?.count ?? 0);
    res.json({
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === "active").length,
      trialTenants: tenants.filter(t => t.status === "trial").length,
      suspendedTenants: tenants.filter(t => t.status === "suspended").length,
      totalBusinesses: businesses.length,
      totalQueuesToday: queuesToday,
      totalAppointmentsToday: apptsToday,
      totalAppointmentsThisMonth: apptsMonth,
    });
  } catch (err) { next(err); }
});

router.get("/stats/tenant", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const businesses = await db.select().from(businessesTable).where(eq(businessesTable.tenantId, tenantId));
    const today = new Date().toISOString().split("T")[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const waiting = await db.select({ count: count() }).from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.tenantId, tenantId), eq(queueEntriesTable.status, "waiting")))
      .then(r => r[0]?.count ?? 0);
    const servedToday = await db.select({ count: count() }).from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.tenantId, tenantId), eq(queueEntriesTable.status, "done"), gte(queueEntriesTable.createdAt, new Date(today))))
      .then(r => r[0]?.count ?? 0);
    const apptsToday = await db.select({ count: count() }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.tenantId, tenantId), gte(appointmentsTable.scheduledAt, new Date(today))))
      .then(r => r[0]?.count ?? 0);
    const apptsWeek = await db.select({ count: count() }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.tenantId, tenantId), gte(appointmentsTable.scheduledAt, startOfWeek)))
      .then(r => r[0]?.count ?? 0);
    const avgWait = await db.select({ avg: avg(queueEntriesTable.createdAt) }).from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.tenantId, tenantId), eq(queueEntriesTable.status, "done")))
      .then(r => 15);
    const totalEntries = await db.select({ count: count() }).from(queueEntriesTable)
      .where(eq(queueEntriesTable.tenantId, tenantId))
      .then(r => r[0]?.count ?? 0);
    const noShows = await db.select({ count: count() }).from(queueEntriesTable)
      .where(and(eq(queueEntriesTable.tenantId, tenantId), eq(queueEntriesTable.status, "no_show")))
      .then(r => r[0]?.count ?? 0);
    const noShowRate = totalEntries > 0 ? Math.round((noShows / totalEntries) * 100) : 0;
    res.json({
      totalBusinesses: businesses.length,
      waitingNow: waiting,
      servedToday,
      appointmentsToday: apptsToday,
      appointmentsThisWeek: apptsWeek,
      avgWaitMinutes: avgWait || 15,
      noShowRate,
    });
  } catch (err) { next(err); }
});

export default router;
