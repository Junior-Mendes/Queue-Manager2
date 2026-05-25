import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const tenantUsersTable = pgTable("tenant_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("operator"), // tenant_admin | operator
  mustChangePassword: timestamp("must_change_password").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("tenant_users_tenant_idx").on(t.tenantId),
  index("tenant_users_email_idx").on(t.email),
]);

export const insertTenantUserSchema = createInsertSchema(tenantUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTenantUserSchema = createSelectSchema(tenantUsersTable);
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantUser = typeof tenantUsersTable.$inferSelect;
