import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminsTable = pgTable("admins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(adminsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAdminSchema = createSelectSchema(adminsTable);
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;
