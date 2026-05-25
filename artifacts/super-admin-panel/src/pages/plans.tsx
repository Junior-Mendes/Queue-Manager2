import { useState } from "react";
import { useListPlans, useCreatePlan, useUpdatePlan, useDeletePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import type { Plan, CreatePlanInput } from "@workspace/api-client-react";
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";

const emptyPlan: CreatePlanInput = {
  name: "",
  slug: "",
  description: null,
  maxBusinesses: 1,
  maxOperators: 1,
  maxQueuesPerDay: 10,
  price: 0,
  status: "active",
};

export default function PlansPage() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useListPlans({});

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePlanInput>(emptyPlan);

  const createPlan = useCreatePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
        setIsOpen(false);
        setForm(emptyPlan);
      },
    },
  });

  const updatePlan = useUpdatePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
        setIsOpen(false);
        setEditingId(null);
        setForm(emptyPlan);
      },
    },
  });

  const deletePlan = useDeletePlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
      },
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setIsOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      maxBusinesses: plan.maxBusinesses,
      maxOperators: plan.maxOperators,
      maxQueuesPerDay: plan.maxQueuesPerDay,
      price: plan.price,
      status: plan.status,
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updatePlan.mutate({ id: editingId, data: form });
    } else {
      createPlan.mutate({ data: form });
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    inactive: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground">Manage SaaS subscription plans.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-plan">
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mb-3" />
              <p>No plans configured yet.</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                Create your first plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Name</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Slug</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Limits</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Price</th>
                    <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Status</th>
                    <th className="py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: Plan) => (
                    <tr key={plan.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{plan.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{plan.slug}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {plan.maxBusinesses} biz / {plan.maxOperators} ops / {plan.maxQueuesPerDay} queues/day
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        ${plan.price.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={statusColors[plan.status]}>
                          {plan.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(plan)}
                            data-testid={`button-edit-plan-${plan.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-delete-plan-${plan.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{plan.name}</strong>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePlan.mutate({ id: plan.id })}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>
              Define the plan limits and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Professional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input
                id="plan-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. professional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-desc">Description</Label>
              <Input
                id="plan-desc"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-biz">Max Businesses</Label>
                <Input
                  id="plan-biz"
                  type="number"
                  value={form.maxBusinesses}
                  onChange={(e) => setForm({ ...form, maxBusinesses: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-ops">Max Operators</Label>
                <Input
                  id="plan-ops"
                  type="number"
                  value={form.maxOperators}
                  onChange={(e) => setForm({ ...form, maxOperators: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-queues">Queues/Day</Label>
                <Input
                  id="plan-queues"
                  type="number"
                  value={form.maxQueuesPerDay}
                  onChange={(e) => setForm({ ...form, maxQueuesPerDay: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-price">Price ($)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-status">Status</Label>
                <select
                  id="plan-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createPlan.isPending || updatePlan.isPending}>
              {editingId ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
