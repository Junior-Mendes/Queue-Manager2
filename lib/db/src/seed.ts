import { db, pool } from "./index";
import {
  plansTable, tenantsTable, subscriptionsTable, businessesTable, servicesTable,
  professionalsTable, queuesTable, queueEntriesTable, appointmentsTable,
} from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear all existing demo data for idempotency
  console.log("Clearing existing demo data...");
  await db.delete(appointmentsTable);
  await db.delete(queueEntriesTable);
  await db.delete(queuesTable);
  await db.delete(professionalsTable);
  await db.delete(servicesTable);
  await db.delete(businessesTable);
  await db.delete(subscriptionsTable);
  await db.delete(tenantsTable);
  await db.delete(plansTable);

  // 1. Create plans
  const planData = [
    { name: "Free", slug: "free", description: "Free plan for small businesses", maxBusinesses: 1, maxOperators: 3, maxQueuesPerDay: 100, price: 0, status: "active" as const },
    { name: "Basic", slug: "basic", description: "Up to 3 businesses", maxBusinesses: 3, maxOperators: 10, maxQueuesPerDay: 500, price: 4900, status: "active" as const },
    { name: "Pro", slug: "pro", description: "Up to 10 businesses", maxBusinesses: 10, maxOperators: 50, maxQueuesPerDay: 2000, price: 14900, status: "active" as const },
  ];

  for (const p of planData) {
    await db.insert(plansTable).values(p).onConflictDoNothing({ target: plansTable.slug });
  }
  const plans = await db.select().from(plansTable);
  const proPlan = plans.find(p => p.slug === "pro")!;
  console.log("Plans created:", plans.length);

  // 2. Create a demo tenant
  const [tenant] = await db.insert(tenantsTable).values({
    name: "SalonChain Demo",
    slug: "salonchain-demo",
    planId: proPlan.id,
    status: "active",
    ownerClerkId: "demo_owner",
    email: "demo@salonchain.com",
    phone: "+1 555-0000",
  }).onConflictDoNothing({ target: tenantsTable.slug }).returning();

  const tenantId = tenant?.id || (await db.select().from(tenantsTable).where(eq(tenantsTable.slug, "salonchain-demo")).then(r => r[0].id));
  console.log("Tenant created:", tenantId);

  // 3. Create subscription
  await db.insert(subscriptionsTable).values({
    tenantId,
    planId: proPlan.id,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  }).onConflictDoNothing();
  console.log("Subscription created");

  // 4. Create multiple businesses
  const businessData = [
    { tenantId, name: "Main Street Barbers", slug: "main-street-barbers", description: "Classic barbershop since 1995", category: "barbershop", address: "123 Main St, Anytown", phone: "+1 555-1234", openingHours: "Mon-Sat 8:00-18:00" },
    { tenantId, name: "Glamour Beauty Salon", slug: "glamour-beauty", description: "Full-service beauty salon", category: "salon", address: "456 Oak Ave, Anytown", phone: "+1 555-5678", openingHours: "Mon-Sat 9:00-19:00" },
    { tenantId, name: "Nail Art Studio", slug: "nail-art-studio", description: "Premium manicure and nail art", category: "manicure", address: "789 Pine Rd, Anytown", phone: "+1 555-9012", openingHours: "Mon-Sat 10:00-20:00" },
  ];

  for (const b of businessData) {
    await db.insert(businessesTable).values(b).onConflictDoNothing({ target: businessesTable.slug });
  }
  const businesses = await db.select().from(businessesTable).where(eq(businessesTable.tenantId, tenantId));
  console.log("Businesses created:", businesses.length);

  const barber = businesses.find(b => b.slug === "main-street-barbers")!;
  const salon = businesses.find(b => b.slug === "glamour-beauty")!;
  const manicure = businesses.find(b => b.slug === "nail-art-studio")!;

  // 5. Create services per business
  const serviceData = [
    // Barbershop
    { tenantId, businessId: barber.id, name: "Haircut", description: "Standard haircut", durationMinutes: 30 },
    { tenantId, businessId: barber.id, name: "Beard Trim", description: "Beard shaping and trim", durationMinutes: 15 },
    { tenantId, businessId: barber.id, name: "Haircut + Beard", description: "Full service", durationMinutes: 45 },
    { tenantId, businessId: barber.id, name: "Hot Towel Shave", description: "Classic straight razor shave", durationMinutes: 30 },
    // Beauty salon
    { tenantId, businessId: salon.id, name: "Hair Styling", description: "Cut, color, and style", durationMinutes: 60 },
    { tenantId, businessId: salon.id, name: "Facial Treatment", description: "Deep cleansing facial", durationMinutes: 45 },
    { tenantId, businessId: salon.id, name: "Hair Coloring", description: "Full color or highlights", durationMinutes: 90 },
    // Manicure
    { tenantId, businessId: manicure.id, name: "Classic Manicure", description: "Nail care and polish", durationMinutes: 30 },
    { tenantId, businessId: manicure.id, name: "Gel Nails", description: "Long-lasting gel manicure", durationMinutes: 45 },
    { tenantId, businessId: manicure.id, name: "Nail Art", description: "Custom nail designs", durationMinutes: 60 },
  ];

  for (const s of serviceData) {
    await db.insert(servicesTable).values(s).onConflictDoNothing();
  }
  const services = await db.select().from(servicesTable).where(eq(servicesTable.tenantId, tenantId));
  console.log("Services created:", services.length);

  // 6. Create professionals per business
  const profData = [
    // Barbershop
    { tenantId, businessId: barber.id, name: "John Doe", role: "operator", isActive: true },
    { tenantId, businessId: barber.id, name: "Jane Smith", role: "operator", isActive: true },
    // Salon
    { tenantId, businessId: salon.id, name: "Maria Garcia", role: "operator", isActive: true },
    { tenantId, businessId: salon.id, name: "Sarah Chen", role: "operator", isActive: true },
    // Manicure
    { tenantId, businessId: manicure.id, name: "Lisa Wong", role: "operator", isActive: true },
  ];

  for (const p of profData) {
    await db.insert(professionalsTable).values(p).onConflictDoNothing();
  }
  const professionals = await db.select().from(professionalsTable).where(eq(professionalsTable.tenantId, tenantId));
  console.log("Professionals created:", professionals.length);

  const barberProfs = professionals.filter(p => p.businessId === barber.id);
  const salonProfs = professionals.filter(p => p.businessId === salon.id);
  const manicureProfs = professionals.filter(p => p.businessId === manicure.id);
  const barberServices = services.filter(s => s.businessId === barber.id);

  // 7. Create queues for today
  const today = new Date().toISOString().split("T")[0];
  const queueData = [
    { tenantId, businessId: barber.id, serviceId: barberServices[0]?.id, professionalId: barberProfs[0]?.id, date: today, status: "open" as const, currentTicket: 0, lastTicket: 0, avgWaitMinutes: 15 },
    { tenantId, businessId: barber.id, serviceId: barberServices[2]?.id, professionalId: barberProfs[1]?.id, date: today, status: "open" as const, currentTicket: 0, lastTicket: 0, avgWaitMinutes: 20 },
    { tenantId, businessId: salon.id, serviceId: services.find(s => s.name === "Hair Styling")?.id, professionalId: salonProfs[0]?.id, date: today, status: "open" as const, currentTicket: 0, lastTicket: 0, avgWaitMinutes: 30 },
  ];

  const createdQueues = [];
  for (const q of queueData) {
    const [queue] = await db.insert(queuesTable).values(q).returning();
    createdQueues.push(queue);
  }
  console.log("Queues created:", createdQueues.length);

  // 8. Create queue entries
  const entriesData = [
    // Queue 1 (Haircut)
    { tenantId, queueId: createdQueues[0].id, ticketNumber: 1, clientName: "Alice Brown", clientPhone: "+1 555-1001", status: "waiting" as const },
    { tenantId, queueId: createdQueues[0].id, ticketNumber: 2, clientName: "Bob Wilson", clientPhone: "+1 555-1002", status: "waiting" as const },
    { tenantId, queueId: createdQueues[0].id, ticketNumber: 3, clientName: "Charlie Davis", clientPhone: "+1 555-1003", status: "waiting" as const },
    { tenantId, queueId: createdQueues[0].id, ticketNumber: 4, clientName: "Diana Evans", clientPhone: "+1 555-1004", status: "waiting" as const },
    // Queue 2 (Haircut + Beard)
    { tenantId, queueId: createdQueues[1].id, ticketNumber: 1, clientName: "Edward Foster", clientPhone: "+1 555-1005", status: "waiting" as const },
    { tenantId, queueId: createdQueues[1].id, ticketNumber: 2, clientName: "Fiona Green", clientPhone: "+1 555-1006", status: "waiting" as const },
    // Queue 3 (Hair Styling)
    { tenantId, queueId: createdQueues[2].id, ticketNumber: 1, clientName: "George Hill", clientPhone: "+1 555-1007", status: "waiting" as const },
    { tenantId, queueId: createdQueues[2].id, ticketNumber: 2, clientName: "Helen Irving", clientPhone: "+1 555-1008", status: "waiting" as const },
  ];

  for (const e of entriesData) {
    await db.insert(queueEntriesTable).values(e);
  }
  // Update queue lastTicket
  for (const q of createdQueues) {
    const count = entriesData.filter(e => e.queueId === q.id).length;
    await db.update(queuesTable).set({ lastTicket: count }).where(eq(queuesTable.id, q.id));
  }
  console.log("Queue entries created:", entriesData.length);

  // 9. Create appointments
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const appointmentData = [
    { tenantId, businessId: barber.id, serviceId: barberServices[0]?.id, professionalId: barberProfs[0]?.id, clientName: "Frank Miller", clientPhone: "+1 555-2001", scheduledAt: tomorrow, status: "scheduled" as const, notes: "First visit" },
    { tenantId, businessId: barber.id, serviceId: barberServices[1]?.id, professionalId: barberProfs[1]?.id, clientName: "Grace Lee", clientPhone: "+1 555-2002", scheduledAt: new Date(tomorrow.getTime() + 30 * 60000), status: "confirmed" as const },
    { tenantId, businessId: salon.id, serviceId: services.find(s => s.name === "Hair Coloring")?.id, professionalId: salonProfs[0]?.id, clientName: "Henry Taylor", clientPhone: "+1 555-2003", scheduledAt: new Date(tomorrow.getTime() + 60 * 60000), status: "scheduled" as const },
    { tenantId, businessId: manicure.id, serviceId: services.find(s => s.name === "Gel Nails")?.id, professionalId: manicureProfs[0]?.id, clientName: "Irene Jackson", clientPhone: "+1 555-2004", scheduledAt: new Date(tomorrow.getTime() + 120 * 60000), status: "scheduled" as const },
  ];

  for (const a of appointmentData) {
    await db.insert(appointmentsTable).values(a);
  }
  console.log("Appointments created:", appointmentData.length);

  console.log("\nSeed completed successfully!");
  console.log("Demo tenant slug: salonchain-demo");
  console.log("Businesses:", businesses.map(b => `${b.name} (${b.slug})`).join(", "));
}

seed().catch(console.error).finally(() => pool.end());
