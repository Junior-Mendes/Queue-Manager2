import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, businessesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  ListAppointmentsQueryParams,
  ListAppointmentsResponse,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentStatusBody,
  GetAvailableSlotsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";
import { broadcastAppointmentUpdate } from "../lib/wsManager";
import { z } from "zod";

const router = Router();

// Appointment management: tenant_admin, operator, or super_admin
router.get("/appointments", requireAuth, loadUserContext, requireRole("tenant_admin", "operator", "super_admin"), requireTenant, async (req, res, next) => {
  try {
    const query = ListAppointmentsQueryParams.safeParse(req.query);
    const businessId = query.success ? query.data.businessId : "";
    if (!businessId) return res.status(400).json({ error: "businessId required" });
    let conditions = and(
      eq(appointmentsTable.businessId, businessId),
      eq(appointmentsTable.tenantId, req.tenantId!),
    );
    if (query.success && query.data.status) {
      conditions = and(conditions, eq(appointmentsTable.status, query.data.status as any));
    }
    if (query.success && query.data.date) {
      const date = new Date(query.data.date);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      conditions = and(conditions, gte(appointmentsTable.scheduledAt, start), lte(appointmentsTable.scheduledAt, end));
    }
    const appointments = await db.select().from(appointmentsTable).where(conditions);
    return res.json(appointments);
  } catch (err) { return next(err); }
});

router.get("/appointments/available-slots", async (req, res, next) => {
  try {
    const query = GetAvailableSlotsQueryParams.parse(req.query);
    const { businessId, date, serviceId, professionalId } = query;
    const selectedDate = new Date(date);
    const daySlots: { time: string; available: boolean; professionalId: string | null }[] = [];
    const startHour = 8;
    const endHour = 18;
    const intervalMinutes = 30;
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
    let cond: any = and(
      eq(appointmentsTable.businessId, businessId),
      gte(appointmentsTable.scheduledAt, start),
      lte(appointmentsTable.scheduledAt, end),
    );
    if (professionalId) {
      cond = and(cond, eq(appointmentsTable.professionalId, professionalId));
    }
    const existing = await db.select().from(appointmentsTable).where(cond);
    const taken = new Set(
      existing
        .filter(a => a.status !== "cancelled" && a.status !== "no_show")
        .map(a => {
          const d = new Date(a.scheduledAt);
          return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        })
    );
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += intervalMinutes) {
        const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        daySlots.push({ time, available: !taken.has(time), professionalId: professionalId || null });
      }
    }
    return res.json(daySlots);
  } catch (err) { return next(err); }
});

// Anonymous clients can book appointments
router.post("/appointments", async (req, res, next) => {
  try {
    const body = CreateAppointmentBody.parse(req.body);
    const business = await db.select().from(businessesTable).where(eq(businessesTable.id, body.businessId)).then(r => r[0]);
    if (!business) return res.status(404).json({ error: "Business not found" });
    const insertData: any = {
      ...body,
      tenantId: business.tenantId,
      scheduledAt: new Date(body.scheduledAt),
    };
    const [appointment] = await db.insert(appointmentsTable).values(insertData).returning();
    return res.status(201).json(appointment);
  } catch (err) { return next(err); }
});

// Anonymous clients can check appointment status
router.get("/appointments/:id", async (req, res, next) => {
  try {
    const params = GetAppointmentParams.parse({ id: req.params.id });
    const appointment = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.id)).then(r => r[0]);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    return res.json(appointment);
  } catch (err) { return next(err); }
});

// Anonymous clients can cancel their appointment
router.patch("/appointments/:id", async (req, res, next) => {
  try {
    const params = GetAppointmentParams.parse({ id: req.params.id });
    const body = UpdateAppointmentStatusBody.parse(req.body);
    const appointment = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.id)).then(r => r[0]);
    if (!appointment) return res.status(404).json({ error: "Not found" });
    const updateData: any = { status: body.status };
    if (body.status === "confirmed") updateData.confirmedAt = new Date();
    if (body.status === "in_service") updateData.startedAt = new Date();
    if (body.status === "done") updateData.finishedAt = new Date();
    if (body.status === "cancelled") updateData.cancelReason = body.cancelReason || "Cancelled by client";
    const [updated] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, params.id)).returning();
    broadcastAppointmentUpdate(params.id, updated);
    return res.json(updated);
  } catch (err) { return next(err); }
});

export default router;
