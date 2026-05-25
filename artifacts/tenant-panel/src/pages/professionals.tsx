import { useState } from "react";
import {
  useListBusinesses,
  useListProfessionals,
  useCreateProfessional,
  useUpdateProfessional,
  useDeleteProfessional,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfessionalsPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", role: "Stylist", isActive: true });
  const { toast } = useToast();

  const { data: businesses, isLoading: loadingBusinesses } = useListBusinesses();
  const { data: professionals, isLoading } = useListProfessionals(
    selectedBusinessId || "",
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/businesses/professionals", selectedBusinessId] } }
  );

  const createProf = useCreateProfessional();
  const updateProf = useUpdateProfessional();
  const deleteProf = useDeleteProfessional();

  function openCreate() {
    setEditing(null);
    setForm({ name: "", role: "Stylist", isActive: true });
    setDialogOpen(true);
  }

  function openEdit(p: any) {
    setEditing(p);
    setForm({ name: p.name, role: p.role, isActive: p.isActive });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !selectedBusinessId) return;
    const payload = {
      name: form.name,
      role: form.role,
      isActive: form.isActive,
    };
    if (editing) {
      updateProf.mutate(
        { businessId: selectedBusinessId, id: editing.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Professional updated" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createProf.mutate(
        { businessId: selectedBusinessId, data: payload },
        {
          onSuccess: () => { toast({ title: "Professional added" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this professional?")) return;
    if (!selectedBusinessId) return;
    deleteProf.mutate(
      { businessId: selectedBusinessId, id },
      {
        onSuccess: () => toast({ title: "Professional removed" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professionals</h1>
          <p className="text-muted-foreground">Manage staff and service providers.</p>
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
          <Button onClick={openCreate} disabled={!selectedBusinessId} data-testid="button-add-professional">
            <Plus className="h-4 w-4 mr-2" />
            Add Professional
          </Button>
        </div>
      </div>

      {!selectedBusinessId ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>Select a Business</CardTitle>
            <CardDescription>Choose a business to view and manage its professionals.</CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : professionals?.length === 0 ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>No professionals yet</CardTitle>
            <CardDescription>Add your first professional to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreate}>Add Professional</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals?.map((p) => (
            <Card key={p.id} data-testid={`card-professional-${p.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                      <span>{p.role}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
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
            <DialogTitle>{editing ? "Edit Professional" : "Add Professional"}</DialogTitle>
            <DialogDescription>Enter the professional details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Stylist" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createProf.isPending || updateProf.isPending}>
              {editing ? "Save Changes" : "Add Professional"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
