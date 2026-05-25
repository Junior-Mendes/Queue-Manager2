import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { plansTable } from "./plans";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "trial", "cancelled", "past_due", "paused"]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plansTable.id),
  status: subscriptionStatusEnum("status").notNull().default("trial"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSubscriptionSchema = createSelectSchema(subscriptionsTable);
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
