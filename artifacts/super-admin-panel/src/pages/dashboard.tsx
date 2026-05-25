import { useGetSaasStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, CalendarCheck, ListOrdered, TrendingUp, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetSaasStats({});

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Tenants",
      value: stats?.totalTenants ?? 0,
      subtitle: "All registered tenants",
      icon: Building2,
      testId: "text-total-tenants",
    },
    {
      title: "Active Tenants",
      value: stats?.activeTenants ?? 0,
      subtitle: "Currently active",
      icon: Users,
      testId: "text-active-tenants",
    },
    {
      title: "Trial Tenants",
      value: stats?.trialTenants ?? 0,
      subtitle: "On trial period",
      icon: TrendingUp,
      testId: "text-trial-tenants",
    },
    {
      title: "Suspended",
      value: stats?.suspendedTenants ?? 0,
      subtitle: "Temporarily suspended",
      icon: AlertTriangle,
      testId: "text-suspended-tenants",
    },
    {
      title: "Total Businesses",
      value: stats?.totalBusinesses ?? 0,
      subtitle: "Units across platform",
      icon: Building2,
      testId: "text-total-businesses",
    },
    {
      title: "Queues Today",
      value: stats?.totalQueuesToday ?? 0,
      subtitle: "Active queues opened",
      icon: ListOrdered,
      testId: "text-queues-today",
    },
    {
      title: "Appointments Today",
      value: stats?.totalAppointmentsToday ?? 0,
      subtitle: "Scheduled for today",
      icon: CalendarCheck,
      testId: "text-appointments-today",
    },
    {
      title: "Appointments This Month",
      value: stats?.totalAppointmentsThisMonth ?? 0,
      subtitle: "Monthly volume",
      icon: CalendarCheck,
      testId: "text-appointments-month",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SaaS Dashboard</h1>
        <p className="text-muted-foreground">Global platform metrics and overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.testId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={card.testId}>{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
