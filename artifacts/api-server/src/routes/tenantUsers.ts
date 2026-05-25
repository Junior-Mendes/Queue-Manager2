import { Router } from "express";
import { db } from "@workspace/db";
import { tenantUsersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import { requireAuth, loadUserContext, requireRole } from "../middlewares/auth";

const router = Router();
const SALT_ROUNDS = 10;

const CreateTenantUserBody = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["tenant_admin", "operator"]).default("operator"),
});

const UpdateTenantUserBody = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["tenant_admin", "operator"]).optional(),
});

// List users for a tenant (super_admin or tenant_admin of that tenant)
router.get("/tenant-users", requireAuth, loadUserContext, async (req, res, next) => {
  try {
    if (req.role === "super_admin") {
      const users = await db.select().from(tenantUsersTable);
      return res.json(users);
    }
    if (req.role === "tenant_admin" && req.tenantId) {
      const users = await db.select().from(tenantUsersTable).where(eq(tenantUsersTable.tenantId, req.tenantId));
      return res.json(users);
    }
    return res.status(403).json({ error: "Forbidden" });
  } catch (err) { return next(err); }
});

// Create tenant user (super_admin or tenant_admin)
router.post("/tenant-users", requireAuth, loadUserContext, async (req, res, next) => {
  try {
    const body = CreateTenantUserBody.parse(req.body);

    // Authorization check
    if (req.role !== "super_admin") {
      if (req.role !== "tenant_admin" || req.tenantId !== body.tenantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Verify tenant exists
    const tenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, body.tenantId)).then(r => r[0]);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    // Prevent duplicate email
    const existing = await db.select().from(tenantUsersTable).where(eq(tenantUsersTable.email, body.email)).then(r => r[0]);
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const [user] = await db.insert(tenantUsersTable).values({
      tenantId: body.tenantId,
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role,
    }).returning();

    return res.status(201).json({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) { return next(err); }
});

// Get single tenant user
router.get("/tenant-users/:id", requireAuth, loadUserContext, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const user = await db.select().from(tenantUsersTable).where(eq(tenantUsersTable.id, id)).then(r => r[0]);
    if (!user) return res.status(404).json({ error: "Not found" });

    if (req.role === "super_admin") return res.json(user);
    if (req.role === "tenant_admin" && req.tenantId === user.tenantId) return res.json(user);

    return res.status(403).json({ error: "Forbidden" });
  } catch (err) { return next(err); }
});

// Update tenant user
router.put("/tenant-users/:id", requireAuth, loadUserContext, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = UpdateTenantUserBody.parse(req.body);
    const user = await db.select().from(tenantUsersTable).where(eq(tenantUsersTable.id, id)).then(r => r[0]);
    if (!user) return res.status(404).json({ error: "Not found" });

    if (req.role !== "super_admin" && (req.role !== "tenant_admin" || req.tenantId !== user.tenantId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [updated] = await db.update(tenantUsersTable).set(body).where(eq(tenantUsersTable.id, id)).returning();
    return res.json(updated);
  } catch (err) { return next(err); }
});

// Delete tenant user
router.delete("/tenant-users/:id", requireAuth, loadUserContext, requireRole("super_admin", "tenant_admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const user = await db.select().from(tenantUsersTable).where(eq(tenantUsersTable.id, id)).then(r => r[0]);
    if (!user) return res.status(404).json({ error: "Not found" });

    if (req.role === "tenant_admin" && req.tenantId !== user.tenantId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(tenantUsersTable).where(eq(tenantUsersTable.id, id));
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
