import { getAuth, createClerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { tenantsTable, professionalsTable } from "@workspace/db";

// Request augmentation
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: "super_admin" | "tenant_admin" | "operator" | null;
      tenantId?: string | null;
      businessId?: string | null;
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction): void | Response {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
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

  const auth = getAuth(req);
  const metadata = (auth?.sessionClaims as any)?.metadata ?? {};
  let role = metadata?.role;
  let tenantId = metadata?.tenantId;
  let businessId = metadata?.businessId;

  // When claims are empty (e.g. raw session token without metadata), query Clerk backend
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
      // Clerk lookup failed — keep whatever we have and fall through
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

  // Fallback: derive role and tenant from database lookups
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
