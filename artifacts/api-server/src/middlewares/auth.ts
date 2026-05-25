import { getAuth } from "@clerk/express";
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

async function loadUserContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) return next();

  // Check metadata for role (super_admin, tenant_admin, operator)
  const auth = getAuth(req);
  const metadata = (auth?.sessionClaims as any)?.metadata ?? {};
  const role = metadata?.role;

  if (role === "super_admin") {
    req.role = "super_admin";
    return next();
  }

  // Find tenant by ownerClerkId for tenant_admin
  const tenant = await db.query.tenantsTable.findFirst({
    where: eq(tenantsTable.ownerClerkId, req.userId),
  });

  if (tenant) {
    req.role = "tenant_admin";
    req.tenantId = tenant.id;
    return next();
  }

  // Check if user is a professional/operator
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
