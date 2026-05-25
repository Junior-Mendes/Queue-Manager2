import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, tenantUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  ListTenantsQueryParams,
  CreateTenantBody,
  GetTenantParams,
  UpdateTenantBody,
  UpdateTenantStatusBody,
} from "@workspace/api-zod";
import { requireAuth, loadUserContext, requireRole, requireTenant } from "../middlewares/auth";

const router = Router();
const SALT_ROUNDS = 10;

function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Tenant CRUD: super_admin for list/create/status; tenant_admin for own tenant
router.get("/tenants", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const query = ListTenantsQueryParams.safeParse(req.query);
    let conditions = undefined;
    if (query.success && query.data.status) {
      conditions = eq(tenantsTable.status, query.data.status as any);
    }
    const tenants = conditions
      ? await db.select().from(tenantsTable).where(conditions)
      : await db.select().from(tenantsTable);
    return res.json(tenants);
  } catch (err) { return next(err); }
});

router.post("/tenants", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const body = CreateTenantBody.parse(req.body);

    // Create tenant
    const [tenant] = await db.insert(tenantsTable).values({
      ...body,
      ownerClerkId: req.userId!,
    }).returning();

    // Generate initial admin user for the tenant
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await db.insert(tenantUsersTable).values({
      tenantId: tenant.id,
      email: body.email,
      passwordHash,
      name: body.name,
      role: "tenant_admin",
      mustChangePassword: new Date(), // must change on first login
    });

    return res.status(201).json({ ...tenant, tempPassword });
  } catch (err) { return next(err); }
});

router.get("/tenants/me", requireAuth, loadUserContext, requireTenant, async (req, res, next) => {
  try {
    const tenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.tenantId!)).then(r => r[0]);
    if (!tenant) return res.status(404).json({ error: "Not found" });
    return res.json(tenant);
  } catch (err) { return next(err); }
});

router.get("/tenants/:id", requireAuth, loadUserContext, requireRole("super_admin", "tenant_admin"), async (req, res, next) => {
  try {
    const params = GetTenantParams.parse({ id: req.params.id });
    const tenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.id)).then(r => r[0]);
    if (!tenant) return res.status(404).json({ error: "Not found" });
    if (req.role === "tenant_admin" && tenant.id !== req.tenantId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(tenant);
  } catch (err) { return next(err); }
});

router.put("/tenants/:id", requireAuth, loadUserContext, requireRole("super_admin", "tenant_admin"), async (req, res, next) => {
  try {
    const params = GetTenantParams.parse({ id: req.params.id });
    const body = UpdateTenantBody.parse(req.body);
    const tenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.id)).then(r => r[0]);
    if (!tenant) return res.status(404).json({ error: "Not found" });
    if (req.role === "tenant_admin" && tenant.id !== req.tenantId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const [updated] = await db.update(tenantsTable).set(body).where(eq(tenantsTable.id, params.id)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

router.patch("/tenants/:id/status", requireAuth, loadUserContext, requireRole("super_admin"), async (req, res, next) => {
  try {
    const params = GetTenantParams.parse({ id: req.params.id });
    const body = UpdateTenantStatusBody.parse(req.body);
    const [tenant] = await db.update(tenantsTable).set({ status: body.status }).where(eq(tenantsTable.id, params.id)).returning();
    if (!tenant) return res.status(404).json({ error: "Not found" });
    return res.json(tenant);
  } catch (err) { return next(err); }
});

export default router;
