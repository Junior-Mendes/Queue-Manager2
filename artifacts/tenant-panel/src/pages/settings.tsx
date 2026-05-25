import { useGetMyTenant } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Hash } from "lucide-react";

export default function SettingsPage() {
  const { data: tenant, isLoading } = useGetMyTenant();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card className="p-12 text-center">
        <CardHeader>
          <CardTitle>Tenant Not Found</CardTitle>
          <CardDescription>No tenant is associated with your account.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your tenant account details and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="font-medium">{tenant.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Slug</span>
            <span className="font-medium">{tenant.slug}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={tenant.status === "active" ? "default" : "secondary"}>{tenant.status}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Tenant ID</span>
            <span className="font-mono text-xs">{tenant.id}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Owner ID</span>
            <span className="font-mono text-xs">{tenant.ownerClerkId}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Updated</span>
            <span className="font-medium">{new Date(tenant.updatedAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
