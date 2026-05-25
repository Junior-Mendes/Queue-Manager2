import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { tenantsTable, professionalsTable, adminsTable, tenantUsersTable } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// Request augmentation
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: "super_admin" | "tenant_admin" | "operator" | null;
      tenantId?: string | null;
      businessId?: string | null;
      authType?: "clerk" | "local";
    }
  }
}

// ── Unified auth: accepts Clerk session OR local JWT ─────────────────────────

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  // 1. Try Clerk first (session cookie or __session header)
  const clerkAuth = getAuth(req);
  if (clerkAuth?.userId) {
    req.userId = clerkAuth.userId;
    req.authType = "clerk";
    return next();
  }

  // 2. Try local JWT (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (payload.type === "admin" && payload.sub) {
        req.userId = payload.sub;
        req.role = "super_admin";
        req.authType = "local";
        return next();
      }
      if (payload.type === "tenant" && payload.sub) {
        req.userId = payload.sub;
        req.tenantId = payload.tenantId;
        req.role = payload.role as any;
        req.authType = "local";
        return next();
      }
    } catch {
      // Invalid token — fall through
    }
  }

  return res.status(401).json({ error: "Unauthorized" });
}

let _clerkBackend: ReturnType<typeof createClerkClient> | null = null;
function getClerkBackend() {
  if (!_clerkBackend && process.env.CLERK_SECRET_KEY) {
    _clerkBackend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return _clerkBackend;
}

async function loadUserContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) return next();

  // Local auth: role/tenant already set in requireAuth
  if (req.authType === "local") {
    return next();
  }

  // Clerk auth: look up metadata
  const auth = getAuth(req);
  const metadata = (auth?.sessionClaims as any)?.metadata ?? {};
  let role = metadata?.role;
  let tenantId = metadata?.tenantId;
  let businessId = metadata?.businessId;

  if (!role && !tenantId) {
    try {
      const clerk = getClerkBackend();
      if (clerk) {
        const user = await clerk.users.getUser(req.userId);
        const md = user.publicMetadata as any;
        if (md?.role) role = md.role;
        if (md?.tenantId) tenantId = md.tenantId;
        if (md?.businessId) businessId = md.businessId;
      }
    } catch {
      // ignore
    }
  }

  if (role === "super_admin") {
    req.role = "super_admin";
    return next();
  }

  if (role === "tenant_admin" && tenantId) {
    req.role = "tenant_admin";
    req.tenantId = tenantId;
    return next();
  }

  if (role === "operator" && tenantId) {
    req.role = "operator";
    req.tenantId = tenantId;
    if (businessId) req.businessId = businessId;
    return next();
  }

  // Fallback: derive from database (legacy Clerk users linked to tenants/professionals)
  const tenant = await db.query.tenantsTable.findFirst({
    where: eq(tenantsTable.ownerClerkId, req.userId),
  });
  if (tenant) {
    req.role = "tenant_admin";
    req.tenantId = tenant.id;
    return next();
  }

  const prof = await db.query.professionalsTable.findFirst({
    where: eq(professionalsTable.clerkId, req.userId),
  });
  if (prof) {
    req.role = "operator";
    req.tenantId = prof.tenantId;
    req.businessId = prof.businessId;
    return next();
  }

  req.role = null;
  next();
}

function requireRole(...roles: ("super_admin" | "tenant_admin" | "operator")[]) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function requireTenant(req: Request, res: Response, next: NextFunction): void | Response {
  if (!req.tenantId) {
    return res.status(403).json({ error: "Forbidden: no tenant" });
  }
  next();
}

export { requireAuth, loadUserContext, requireRole, requireTenant };
