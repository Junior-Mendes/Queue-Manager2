import { Link } from "wouter";
import { useGetTenant, useListBusinesses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Mail, Phone, Calendar, Users, Clock, CalendarCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  trial: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  suspended: "bg-red-100 text-red-700 hover:bg-red-100",
  cancelled: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

export default function TenantDetailPage({ tenantId }: { tenantId: string }) {
  const { data: tenant, isLoading: tenantLoading } = useGetTenant(tenantId, {});
  const { data: businesses, isLoading: businessesLoading } = useListBusinesses({});

  const tenantBusinesses = (businesses || []).filter((b) => b.tenantId === tenantId);

  if (tenantLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>Tenant not found.</p>
        <Link href="/tenants">
          <Button variant="outline" className="mt-4">Back to Tenants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/tenants">
          <Button variant="ghost" size="icon" data-testid="button-back-tenants">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">Tenant details and activity.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Slug</p>
                <p className="text-sm text-muted-foreground">{tenant.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{tenant.email}</p>
              </div>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={statusColors[tenant.status]}>
                {tenant.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            {businessesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : tenantBusinesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Building2 className="h-6 w-6 mb-2" />
                <p className="text-sm">No businesses registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tenantBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{business.name}</p>
                      <p className="text-xs text-muted-foreground">{business.category}</p>
                    </div>
                    <Badge variant="outline">{business.slug}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
