import { useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, List, User, Phone, CheckCircle } from "lucide-react";
import {
  useGetPublicBusiness,
  useListQueues,
  useJoinQueue,
} from "@workspace/api-client-react";
import { saveSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

export default function JoinQueuePage() {
  const { slug } = useParams();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(search);
  const preServiceId = params.get("service") || "";

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(preServiceId);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [joined, setJoined] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: business, isLoading: loadingBusiness } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  const { data: queues, isLoading: loadingQueues } = useListQueues(
    { businessId: business?.id || "", date: today },
    { query: { enabled: !!business?.id, queryKey: ["/api/queues", business?.id, today] } }
  );

  const joinQueue = useJoinQueue();

  const activeQueue = queues?.find(
    (q: any) =>
      q.status === "open" &&
      (selectedServiceId ? q.serviceId === selectedServiceId : true) &&
      (selectedProfessionalId ? q.professionalId === selectedProfessionalId : true)
  );

  const services = business?.services || [];
  const professionals = business?.professionals || [];

  const handleJoin = async () => {
    if (!activeQueue || !clientName.trim()) return;
    try {
      const entry = await joinQueue.mutateAsync({
        queueId: activeQueue.id,
        data: {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          serviceId: selectedServiceId || undefined,
          professionalId: selectedProfessionalId || undefined,
        },
      });
      saveSession({
        type: "queue",
        id: entry.id,
        queueId: activeQueue.id,
        businessSlug: slug!,
        businessName: business?.name || "",
      });
      setJoined(true);
      toast({ title: "Você entrou na fila!" });
    } catch {
      toast({ title: "Erro ao entrar na fila", variant: "destructive" });
    }
  };

  if (joined) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Você entrou na fila!</h2>
        <p className="text-muted-foreground mb-6">
          Acompanhe sua posição em tempo real.
        </p>
        <Button onClick={() => navigate("/track")}>
          Acompanhar Fila
        </Button>
      </div>
    );
  }

  if (loadingBusiness) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">Estabelecimento não encontrado</h2>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/${slug}`)} className="-ml-2 mb-2">
          <ArrowLeft className="mr-1 w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold">Entrar na Fila</h1>
        <p className="text-muted-foreground text-sm">{business.name}</p>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* Service selection */}
        {services.length > 0 && (
          <div className="space-y-2">
            <Label>Escolha um serviço (opcional)</Label>
            <div className="space-y-2">
              {services.map((s: any) => (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-colors ${selectedServiceId === s.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => setSelectedServiceId(selectedServiceId === s.id ? "" : s.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.durationMinutes}m</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Professional selection */}
        {professionals.length > 0 && (
          <div className="space-y-2">
            <Label>Escolha um profissional (opcional)</Label>
            <div className="space-y-2">
              {professionals.map((p: any) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-colors ${selectedProfessionalId === p.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => setSelectedProfessionalId(selectedProfessionalId === p.id ? "" : p.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    {p.role && <span className="text-xs text-muted-foreground">{p.role}</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Client details */}
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Nome completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (opcional)</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {!activeQueue && !loadingQueues && (
          <p className="text-sm text-destructive">
            Não há fila aberta para esta seleção. Tente outro serviço ou profissional.
          </p>
        )}

        <Button
          onClick={handleJoin}
          disabled={!clientName.trim() || !activeQueue || joinQueue.isPending}
          className="w-full h-12 text-base"
        >
          <List className="mr-2 w-5 h-5" />
          {joinQueue.isPending ? "Entrando..." : "Entrar na Fila"}
        </Button>
      </div>
    </div>
  );
}
