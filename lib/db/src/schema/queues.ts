import { pgTable, text, integer, boolean, timestamp, date, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { servicesTable } from "./services";
import { professionalsTable } from "./professionals";
import { tenantsTable } from "./tenants";

export const queueStatusEnum = pgEnum("queue_status", ["open", "paused", "closed"]);
export const queueEntryStatusEnum = pgEnum("queue_entry_status", ["waiting", "called", "in_service", "done", "cancelled", "no_show"]);

export const queuesTable = pgTable("queues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  businessId: text("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  serviceId: text("service_id").references(() => servicesTable.id),
  professionalId: text("professional_id").references(() => professionalsTable.id),
  date: date("date").notNull(),
  status: queueStatusEnum("status").notNull().default("open"),
  currentTicket: integer("current_ticket").notNull().default(0),
  lastTicket: integer("last_ticket").notNull().default(0),
  avgWaitMinutes: integer("avg_wait_minutes").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("queues_tenant_idx").on(t.tenantId),
  index("queues_business_idx").on(t.businessId),
  index("queues_date_idx").on(t.date),
]);

export const queueEntriesTable = pgTable("queue_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  queueId: text("queue_id").notNull().references(() => queuesTable.id, { onDelete: "cascade" }),
  ticketNumber: integer("ticket_number").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  serviceId: text("service_id").references(() => servicesTable.id),
  professionalId: text("professional_id").references(() => professionalsTable.id),
  status: queueEntryStatusEnum("status").notNull().default("waiting"),
  calledAt: timestamp("called_at"),
  servedAt: timestamp("served_at"),
  finishedAt: timestamp("finished_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("queue_entries_queue_idx").on(t.queueId),
  index("queue_entries_tenant_idx").on(t.tenantId),
  index("queue_entries_status_idx").on(t.status),
]);

export const insertQueueSchema = createInsertSchema(queuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectQueueSchema = createSelectSchema(queuesTable);
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Queue = typeof queuesTable.$inferSelect;

export const insertQueueEntrySchema = createInsertSchema(queueEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectQueueEntrySchema = createSelectSchema(queueEntriesTable);
export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;
export type QueueEntry = typeof queueEntriesTable.$inferSelect;
