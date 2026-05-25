import { useState } from "react";
import { Link } from "wouter";
import { useListTenants, useUpdateTenantStatus, getListTenantsQueryKey } from "@workspace/api-client-react";
import type { Tenant, TenantStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Building2, Eye, PauseCircle, PlayCircle, XCircle } from "lucide-react";

const statusColors: Record<TenantStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  trial: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  suspended: "bg-red-100 text-red-700 hover:bg-red-100",
  cancelled: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useListTenants(
    statusFilter !== "all" ? { status: statusFilter } : {},
    {}
  );

  const updateStatus = useUpdateTenantStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      },
    },
  });

  const filtered = (tenants || []).filter((t: Tenant) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage all platform tenants.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-tenants"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            data-testid="select-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tenant List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-8 w-8 mb-3" />
              <p>No tenants found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Name</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Slug</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Email</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Status</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Created</th>
                    <th className="py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tenant: Tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.slug}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={statusColors[tenant.status]}>
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/tenants/${tenant.id}`}>
                            <Button size="sm" variant="ghost" data-testid={`button-view-tenant-${tenant.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {tenant.status !== "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatus.mutate({ id: tenant.id, data: { status: "active" } })}
                              data-testid={`button-activate-${tenant.id}`}
                            >
                              <PlayCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {tenant.status !== "suspended" && tenant.status !== "cancelled" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" data-testid={`button-suspend-${tenant.id}`}>
                                  <PauseCircle className="h-4 w-4 text-amber-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspend Tenant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to suspend <strong>{tenant.name}</strong>? The tenant will lose access to the platform until reactivated.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => updateStatus.mutate({ id: tenant.id, data: { status: "suspended" } })}
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                  >
                                    Suspend
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {tenant.status !== "cancelled" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" data-testid={`button-cancel-${tenant.id}`}>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Tenant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel <strong>{tenant.name}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => updateStatus.mutate({ id: tenant.id, data: { status: "cancelled" } })}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                  >
                                    Cancel Tenant
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
