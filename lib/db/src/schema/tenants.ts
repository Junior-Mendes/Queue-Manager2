import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "trial", "suspended", "cancelled"]);

export const tenantsTable = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planId: text("plan_id").references(() => plansTable.id),
  status: tenantStatusEnum("status").notNull().default("trial"),
  ownerClerkId: text("owner_clerk_id"), // Clerk ID (legacy) or local user ID
  email: text("email").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTenantSchema = createSelectSchema(tenantsTable);
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
