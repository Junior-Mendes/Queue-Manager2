import { useState } from "react";
import {
  useListBusinesses,
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ServicesPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", durationMinutes: "30", isActive: true });
  const { toast } = useToast();

  const { data: businesses, isLoading: loadingBusinesses } = useListBusinesses();
  const { data: services, isLoading } = useListServices(
    selectedBusinessId || "",
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/businesses/services", selectedBusinessId] } }
  );

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", durationMinutes: "30", isActive: true });
    setDialogOpen(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", durationMinutes: String(s.durationMinutes), isActive: s.isActive });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !selectedBusinessId) return;
    const payload = {
      name: form.name,
      description: form.description || null,
      durationMinutes: Number(form.durationMinutes),
      isActive: form.isActive,
    };
    if (editing) {
      updateService.mutate(
        { businessId: selectedBusinessId, id: editing.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Service updated" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createService.mutate(
        { businessId: selectedBusinessId, data: payload },
        {
          onSuccess: () => { toast({ title: "Service created" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    if (!selectedBusinessId) return;
    deleteService.mutate(
      { businessId: selectedBusinessId, id },
      {
        onSuccess: () => toast({ title: "Service deleted" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Manage the services offered at your locations.</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} disabled={!selectedBusinessId} data-testid="button-add-service">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {!selectedBusinessId ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>Select a Business</CardTitle>
            <CardDescription>Choose a business to view and manage its services.</CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : services?.length === 0 ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>No services yet</CardTitle>
            <CardDescription>Add your first service to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreate}>Add Service</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services?.map((s) => (
            <Card key={s.id} data-testid={`card-service-${s.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <CardDescription>{s.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  <span>{s.durationMinutes} minutes</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>Enter the service details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Haircut" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} placeholder="30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
              {editing ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
