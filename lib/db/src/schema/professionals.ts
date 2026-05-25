import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { tenantsTable } from "./tenants";

export const professionalsTable = pgTable("professionals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  businessId: text("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  clerkId: text("clerk_id"),
  name: text("name").notNull(),
  role: text("role").notNull().default("operator"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("professionals_tenant_idx").on(t.tenantId),
  index("professionals_business_idx").on(t.businessId),
]);

export const insertProfessionalSchema = createInsertSchema(professionalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectProfessionalSchema = createSelectSchema(professionalsTable);
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionalsTable.$inferSelect;
