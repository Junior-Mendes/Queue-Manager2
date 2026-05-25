import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Scissors,
  Calendar,
  List,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useGetPublicBusiness } from "@workspace/api-client-react";

export default function BusinessPage() {
  const { slug } = useParams();
  const [, navigate] = useLocation();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const { data: business, isLoading } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">Estabelecimento não encontrado</h2>
        <p className="text-muted-foreground mb-4">Verifique o código e tente novamente.</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Voltar
        </Button>
      </div>
    );
  }

  const services = business.services || [];
  const professionals = business.professionals || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background p-4 pb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-2 -ml-2">
          <ArrowLeft className="mr-1 w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">{business.name}</h1>
        {business.description && (
          <p className="text-muted-foreground mt-1 text-sm">{business.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {business.category && (
            <Badge variant="secondary">{business.category}</Badge>
          )}
          {business.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {business.address}
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {business.phone}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-14 text-base"
            onClick={() => navigate(`/${slug}/join` + (selectedService ? `?service=${selectedService}` : ""))}
          >
            <List className="mr-2 w-5 h-5" />
            Entrar na Fila
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 text-base"
            onClick={() => navigate(`/${slug}/book` + (selectedService ? `?service=${selectedService}` : ""))}
          >
            <Calendar className="mr-2 w-5 h-5" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Services */}
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          Serviços
        </h2>
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
        )}
        {services.map((s: any) => (
          <Card
            key={s.id}
            className={`cursor-pointer transition-colors ${selectedService === s.id ? "border-primary ring-1 ring-primary" : ""}`}
            onClick={() => setSelectedService(selectedService === s.id ? null : s.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                {s.description && (
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {s.durationMinutes}m
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Professionals */}
      {professionals.length > 0 && (
        <div className="px-4 pb-8 space-y-3">
          <h2 className="text-lg font-semibold">Profissionais</h2>
          <div className="flex flex-wrap gap-2">
            {professionals.map((p: any) => (
              <Badge key={p.id} variant="secondary" className="px-3 py-1 text-sm">
                {p.name}
                {p.role && <span className="text-muted-foreground ml-1">({p.role})</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
