import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planStatusEnum = pgEnum("plan_status", ["active", "inactive"]);

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  maxBusinesses: integer("max_businesses").notNull().default(1),
  maxOperators: integer("max_operators").notNull().default(3),
  maxQueuesPerDay: integer("max_queues_per_day").notNull().default(100),
  price: integer("price").notNull().default(0),
  status: planStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectPlanSchema = createSelectSchema(plansTable);
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
