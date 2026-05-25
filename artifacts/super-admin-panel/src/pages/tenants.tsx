import { useState } from "react";
import { Link } from "wouter";
import {
  useListTenants,
  useUpdateTenantStatus,
  useCreateTenant,
  useListPlans,
  getListTenantsQueryKey,
} from "@workspace/api-client-react";
import type { Tenant, TenantStatus, CreateTenantInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Search, Building2, Eye, PauseCircle, PlayCircle, XCircle, Plus, AlertCircle } from "lucide-react";

const statusColors: Record<TenantStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  trial: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  suspended: "bg-red-100 text-red-700 hover:bg-red-100",
  cancelled: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

const emptyTenant: CreateTenantInput = {
  name: "",
  slug: "",
  email: "",
  phone: null,
  planId: null,
};

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantInput>(emptyTenant);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useListTenants(
    statusFilter !== "all" ? { status: statusFilter } : {},
    {}
  );

  const { data: plans } = useListPlans({});

  const updateStatus = useUpdateTenantStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      },
    },
  });

  const createTenant = useCreateTenant({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
        setIsCreateOpen(false);
        setForm(emptyTenant);
        if (data?.tempPassword) {
          setCreatedPassword(data.tempPassword);
        }
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

  const handleCreateSubmit = () => {
    if (!form.name.trim() || !form.slug.trim() || !form.email.trim()) return;
    createTenant.mutate({ data: form });
  };

  const handleNameChange = (name: string) => {
    const autoSlug = form.slug === "" || form.slug === form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm({
      ...form,
      name,
      slug: autoSlug
        ? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        : form.slug,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage all platform tenants.</p>
        </div>
        <Button onClick={() => { setForm(emptyTenant); createTenant.reset(); setIsCreateOpen(true); }} data-testid="button-new-tenant">
          <Plus className="h-4 w-4 mr-2" />
          New Tenant
        </Button>
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

      {/* Show generated password after creating tenant */}
      {createdPassword && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Tenant created successfully!</h3>
              <p className="text-sm text-amber-800 mt-1">
                An initial admin account was created. Share this temporary password with the tenant owner:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded bg-white px-3 py-1.5 text-sm font-mono text-amber-900 border border-amber-200">
                  {createdPassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassword);
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                The user must change this password on their first login.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-amber-800"
                onClick={() => setCreatedPassword(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { createTenant.reset(); setCreatedPassword(null); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Tenant</DialogTitle>
            <DialogDescription>
              Create a new B2B tenant and assign them to a plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {createTenant.error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{(createTenant.error as Error).message}</span>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="tenant-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Barbearia Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-slug">Slug <span className="text-destructive">*</span></Label>
              <Input
                id="tenant-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                placeholder="e.g. barbearia-silva"
              />
              <p className="text-xs text-muted-foreground">Unique identifier used in URLs. Auto-filled from name.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="tenant-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@barbearia.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-phone">Phone</Label>
              <Input
                id="tenant-phone"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                placeholder="+55 11 99999-9999 (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <select
                id="tenant-plan"
                value={form.planId || ""}
                onChange={(e) => setForm({ ...form, planId: e.target.value || null })}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No plan (trial)</option>
                {(plans || []).filter(p => p.status === "active").map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}/mo</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!form.name.trim() || !form.slug.trim() || !form.email.trim() || createTenant.isPending}
            >
              {createTenant.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
