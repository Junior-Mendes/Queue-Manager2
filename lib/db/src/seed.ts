import { db, pool } from "./index";
import {
  plansTable, tenantsTable, businessesTable, servicesTable,
  professionalsTable, queuesTable, queueEntriesTable, appointmentsTable,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // 1. Create a plan
  const [plan] = await db.insert(plansTable).values({
    name: "Free",
    slug: "free",
    description: "Free plan for small businesses",
    maxBusinesses: 1,
    maxOperators: 3,
    maxQueuesPerDay: 100,
    price: 0,
    status: "active",
  }).onConflictDoNothing({ target: plansTable.slug }).returning();

  const planId = plan?.id || (await db.select().from(plansTable).where(eq(plansTable.slug, "free")).then(r => r[0].id));
  console.log("Plan created:", planId);

  // 2. Create a demo tenant
  const [tenant] = await db.insert(tenantsTable).values({
    name: "Demo Barber Shop",
    slug: "demo-barber",
    planId,
    status: "active",
    ownerClerkId: "demo_owner",
    email: "demo@example.com",
    phone: "+1 555-0000",
  }).onConflictDoNothing({ target: tenantsTable.slug }).returning();

  const tenantId = tenant?.id || (await db.select().from(tenantsTable).where(eq(tenantsTable.slug, "demo-barber")).then(r => r[0].id));
  console.log("Tenant created:", tenantId);

  // 3. Create a business
  const [business] = await db.insert(businessesTable).values({
    tenantId,
    name: "Main Street Barbers",
    slug: "main-street-barbers",
    description: "Classic barbershop since 1995",
    category: "barbershop",
    address: "123 Main St, Anytown",
    phone: "+1 555-1234",
    openingHours: "Mon-Sat 8:00-18:00",
  }).onConflictDoNothing({ target: businessesTable.slug }).returning();

  const businessId = business?.id || (await db.select().from(businessesTable).where(eq(businessesTable.slug, "main-street-barbers")).then(r => r[0].id));
  console.log("Business created:", businessId);

  // 4. Create services
  const serviceData = [
    { tenantId, businessId, name: "Haircut", description: "Standard haircut", durationMinutes: 30 },
    { tenantId, businessId, name: "Beard Trim", description: "Beard shaping and trim", durationMinutes: 15 },
    { tenantId, businessId, name: "Haircut + Beard", description: "Full service", durationMinutes: 45 },
    { tenantId, businessId, name: "Hot Towel Shave", description: "Classic straight razor shave", durationMinutes: 30 },
  ];

  for (const s of serviceData) {
    await db.insert(servicesTable).values(s).onConflictDoNothing();
  }
  const services = await db.select().from(servicesTable).where(eq(servicesTable.businessId, businessId));
  console.log("Services created:", services.length);

  // 5. Create professionals
  const profData = [
    { tenantId, businessId, name: "John Doe", role: "operator", isActive: true },
    { tenantId, businessId, name: "Jane Smith", role: "operator", isActive: true },
    { tenantId, businessId, name: "Mike Johnson", role: "operator", isActive: true },
  ];

  for (const p of profData) {
    await db.insert(professionalsTable).values(p).onConflictDoNothing();
  }
  const professionals = await db.select().from(professionalsTable).where(eq(professionalsTable.businessId, businessId));
  console.log("Professionals created:", professionals.length);

  // 6. Create a queue for today
  const today = new Date().toISOString().split("T")[0];
  const [queue] = await db.insert(queuesTable).values({
    tenantId,
    businessId,
    serviceId: services[0]?.id,
    professionalId: professionals[0]?.id,
    date: today,
    status: "open",
    currentTicket: 0,
    lastTicket: 0,
    avgWaitMinutes: 15,
  }).returning();
  console.log("Queue created:", queue.id);

  // 7. Create some queue entries
  const entriesData = [
    { tenantId, queueId: queue.id, ticketNumber: 1, clientName: "Alice Brown", clientPhone: "+1 555-1001", status: "waiting" as const },
    { tenantId, queueId: queue.id, ticketNumber: 2, clientName: "Bob Wilson", clientPhone: "+1 555-1002", status: "waiting" as const },
    { tenantId, queueId: queue.id, ticketNumber: 3, clientName: "Charlie Davis", clientPhone: "+1 555-1003", status: "waiting" as const },
    { tenantId, queueId: queue.id, ticketNumber: 4, clientName: "Diana Evans", clientPhone: "+1 555-1004", status: "waiting" as const },
  ];

  for (const e of entriesData) {
    await db.insert(queueEntriesTable).values(e);
  }
  await db.update(queuesTable).set({ lastTicket: 4 }).where(eq(queuesTable.id, queue.id));
  console.log("Queue entries created: 4");

  // 8. Create some appointments
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const appointmentData = [
    { tenantId, businessId, serviceId: services[0]?.id, professionalId: professionals[0]?.id, clientName: "Frank Miller", clientPhone: "+1 555-2001", scheduledAt: tomorrow, status: "scheduled" as const, notes: "First visit" },
    { tenantId, businessId, serviceId: services[1]?.id, professionalId: professionals[1]?.id, clientName: "Grace Lee", clientPhone: "+1 555-2002", scheduledAt: new Date(tomorrow.getTime() + 30 * 60000), status: "confirmed" as const },
    { tenantId, businessId, serviceId: services[2]?.id, professionalId: professionals[2]?.id, clientName: "Henry Taylor", clientPhone: "+1 555-2003", scheduledAt: new Date(tomorrow.getTime() + 60 * 60000), status: "scheduled" as const },
  ];

  for (const a of appointmentData) {
    await db.insert(appointmentsTable).values(a);
  }
  console.log("Appointments created: 3");

  console.log("\nSeed completed successfully!");
  console.log("Demo tenant slug: demo-barber");
  console.log("Demo business slug: main-street-barbers");
}

import { eq } from "drizzle-orm";

seed().catch(console.error).finally(() => pool.end());
