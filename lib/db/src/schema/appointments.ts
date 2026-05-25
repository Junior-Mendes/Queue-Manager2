import { pgTable, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { servicesTable } from "./services";
import { professionalsTable } from "./professionals";
import { tenantsTable } from "./tenants";

export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "confirmed", "in_service", "done", "cancelled", "no_show"]);

export const appointmentsTable = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  businessId: text("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  serviceId: text("service_id").references(() => servicesTable.id),
  professionalId: text("professional_id").references(() => professionalsTable.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  confirmedAt: timestamp("confirmed_at"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("appointments_tenant_idx").on(t.tenantId),
  index("appointments_business_idx").on(t.businessId),
  index("appointments_scheduled_idx").on(t.scheduledAt),
  index("appointments_professional_idx").on(t.professionalId),
]);

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAppointmentSchema = createSelectSchema(appointmentsTable);
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
