import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { adminsTable, tenantUsersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const SALT_ROUNDS = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, role: "super_admin", type: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

function signTenantToken(userId: string, tenantId: string, role: string): string {
  return jwt.sign({ sub: userId, tenantId, role, type: "tenant" }, JWT_SECRET, { expiresIn: "7d" });
}

// ── Zod schemas ──────────────────────────────────────────────────────────────

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const RegisterAdminBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

// ── Admin login ────────────────────────────────────────────────────────────

router.post("/auth/admin/login", async (req, res, next) => {
  try {
    const body = LoginBody.parse(req.body);
    const admin = await db.query.adminsTable.findFirst({
      where: eq(adminsTable.email, body.email),
    });
    if (!admin) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(body.password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signAdminToken(admin.id);
    return res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: "super_admin" } });
  } catch (err) { return next(err); }
});

// ── Admin register (first-time or super_admin only) ────────────────────────

router.post("/auth/admin/register", async (req, res, next) => {
  try {
    const body = RegisterAdminBody.parse(req.body);

    // Prevent duplicate
    const existing = await db.query.adminsTable.findFirst({
      where: eq(adminsTable.email, body.email),
    });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const [admin] = await db.insert(adminsTable).values({
      email: body.email,
      passwordHash,
      name: body.name,
    }).returning();

    const token = signAdminToken(admin.id);
    return res.status(201).json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: "super_admin" } });
  } catch (err) { return next(err); }
});

// ── Tenant login ────────────────────────────────────────────────────────────

router.post("/auth/tenant/login", async (req, res, next) => {
  try {
    const body = LoginBody.parse(req.body);
    const user = await db.query.tenantUsersTable.findFirst({
      where: eq(tenantUsersTable.email, body.email),
    });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signTenantToken(user.id, user.tenantId, user.role);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });
  } catch (err) { return next(err); }
});

// ── Me ──────────────────────────────────────────────────────────────────────

router.get("/auth/me", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (payload.type === "admin") {
      const admin = await db.query.adminsTable.findFirst({ where: eq(adminsTable.id, payload.sub) });
      if (!admin) return res.status(401).json({ error: "User not found" });
      return res.json({ id: admin.id, email: admin.email, name: admin.name, role: "super_admin" });
    }

    if (payload.type === "tenant") {
      const user = await db.query.tenantUsersTable.findFirst({ where: eq(tenantUsersTable.id, payload.sub) });
      if (!user) return res.status(401).json({ error: "User not found" });
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId });
    }

    return res.status(401).json({ error: "Unknown token type" });
  } catch (err) { return next(err); }
});

export default router;
