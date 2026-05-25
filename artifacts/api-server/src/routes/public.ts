import { Router } from "express";
import { db } from "@workspace/db";
import { businessesTable, servicesTable, professionalsTable, queuesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetPublicBusinessParams } from "@workspace/api-zod";

const router = Router();

router.get("/public/businesses/:slug", async (req, res, next) => {
  try {
    const params = GetPublicBusinessParams.parse({ slug: req.params.slug });
    const business = await db.select().from(businessesTable).where(eq(businessesTable.slug, params.slug)).then(r => r[0]);
    if (!business) return res.status(404).json({ error: "Business not found" });
    const services = await db.select().from(servicesTable).where(eq(servicesTable.businessId, business.id));
    const professionals = await db.select().from(professionalsTable).where(eq(professionalsTable.businessId, business.id));
    return res.json({ ...business, services, professionals });
  } catch (err) { return next(err); }
});

router.get("/public/businesses/:slug/queues", async (req, res, next) => {
  try {
    const params = GetPublicBusinessParams.parse({ slug: req.params.slug });
    const business = await db.select().from(businessesTable).where(eq(businessesTable.slug, params.slug)).then(r => r[0]);
    if (!business) return res.status(404).json({ error: "Business not found" });
    const today = new Date().toISOString().split("T")[0];
    const queues = await db.select().from(queuesTable)
      .where(and(eq(queuesTable.businessId, business.id), eq(queuesTable.date, today)));
    return res.json(queues);
  } catch (err) { return next(err); }
});

export default router;
