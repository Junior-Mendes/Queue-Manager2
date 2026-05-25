import { useState } from "react";
import {
  useListBusinesses,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Store, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  category: "general",
  address: "",
  phone: "",
  openingHours: "",
};

export default function Businesses() {
  const { data: businesses, isLoading } = useListBusinesses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const deleteBusiness = useDeleteBusiness();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(b: any) {
    setEditing(b);
    setForm({
      name: b.name,
      slug: b.slug,
      description: b.description || "",
      category: b.category || "general",
      address: b.address || "",
      phone: b.phone || "",
      openingHours: b.openingHours || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) return;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      category: form.category,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      openingHours: form.openingHours.trim() || null,
    };
    if (editing) {
      updateBusiness.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Business updated" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createBusiness.mutate(
        { data: payload },
        {
          onSuccess: () => { toast({ title: "Business created" }); setDialogOpen(false); },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    }
  }

  async function openQr(b: any) {
    const url = `${window.location.origin}/customer-web/${b.slug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrDataUrl(dataUrl);
      setQrDialogOpen(true);
    } catch {
      toast({ title: "Error generating QR code", variant: "destructive" });
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this business?")) return;
    deleteBusiness.mutate(
      { id },
      {
        onSuccess: () => toast({ title: "Business deleted" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">Manage your salon locations.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-business">
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : businesses?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CardHeader>
            <CardTitle>No businesses yet</CardTitle>
            <CardDescription>Get started by creating your first salon location.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreate} data-testid="button-create-first-business">Create Business</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses?.map((business) => (
            <Card key={business.id} data-testid={`card-business-${business.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{business.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openQr(business)} title="QR Code">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(business)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(business.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{business.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {business.address || "No address provided"}
                </p>
                {business.phone && (
                  <p className="text-sm text-muted-foreground mb-2">{business.phone}</p>
                )}
                {business.openingHours && (
                  <p className="text-sm text-muted-foreground">{business.openingHours}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Business" : "Add Business"}</DialogTitle>
            <DialogDescription>Enter the business details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="b-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="b-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const autoSlug = form.slug === "" || form.slug === form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  setForm({
                    ...form,
                    name,
                    slug: autoSlug
                      ? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                      : form.slug,
                  });
                }}
                placeholder="e.g. Barbearia Central"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-slug">Slug <span className="text-destructive">*</span></Label>
              <Input
                id="b-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                placeholder="e.g. barbearia-central"
              />
              <p className="text-xs text-muted-foreground">Unique identifier used in URLs. Auto-filled from name.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-category">Category</Label>
              <Input
                id="b-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. barbershop, salon, spa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-address">Address</Label>
              <Input
                id="b-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City, ZIP"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-phone">Phone</Label>
              <Input
                id="b-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-hours">Opening Hours</Label>
              <Input
                id="b-hours"
                value={form.openingHours}
                onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                placeholder="Mon-Fri 9:00-18:00, Sat 9:00-14:00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-desc">Description</Label>
              <Input
                id="b-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.slug.trim() || createBusiness.isPending || updateBusiness.isPending}
            >
              {editing
                ? (updateBusiness.isPending ? "Saving..." : "Save Changes")
                : (createBusiness.isPending ? "Creating..." : "Create Business")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do Estabelecimento</DialogTitle>
            <DialogDescription>
              Imprima ou compartilhe este QR code para que clientes acessem sua página.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg border" />
            )}
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = qrDataUrl;
                link.download = "qrcode.png";
                link.click();
              }}
            >
              Baixar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
