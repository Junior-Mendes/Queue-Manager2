import { useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, Phone, CheckCircle, Clock } from "lucide-react";
import {
  useGetPublicBusiness,
  useGetAvailableSlots,
  useCreateAppointment,
} from "@workspace/api-client-react";
import { saveSession } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export default function BookPage() {
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
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booked, setBooked] = useState(false);

  const { data: business, isLoading: loadingBusiness } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  const { data: slots, isLoading: loadingSlots } = useGetAvailableSlots(
    {
      businessId: business?.id || "",
      serviceId: selectedServiceId || undefined,
      professionalId: selectedProfessionalId || undefined,
      date: selectedDate,
    },
    {
      query: {
        enabled: !!business?.id && !!selectedDate,
        queryKey: ["/api/appointments/available-slots", business?.id, selectedServiceId, selectedProfessionalId, selectedDate],
      },
    }
  );

  const createAppointment = useCreateAppointment();

  const services = business?.services || [];
  const professionals = business?.professionals || [];

  // Next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const handleBook = async () => {
    if (!business?.id || !clientName.trim() || !selectedTime || !selectedDate) return;
    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
    try {
      const appt = await createAppointment.mutateAsync({
        data: {
          businessId: business.id,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          serviceId: selectedServiceId || undefined,
          professionalId: selectedProfessionalId || undefined,
          scheduledAt,
        },
      });
      saveSession({
        type: "appointment",
        id: appt.id,
        businessSlug: slug!,
        businessName: business?.name || "",
      });
      setBooked(true);
      toast({ title: "Agendamento confirmado!" });
    } catch {
      toast({ title: "Erro ao agendar", variant: "destructive" });
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agendamento confirmado!</h2>
        <p className="text-muted-foreground mb-6">
          {formatDateLabel(selectedDate)} às {selectedTime}
        </p>
        <Button onClick={() => navigate("/track")}>Acompanhar Agendamento</Button>
      </div>
    );
  }

  if (loadingBusiness) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-32 w-full" />
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
        <h1 className="text-xl font-bold">Agendar Horário</h1>
        <p className="text-muted-foreground text-sm">{business.name}</p>
      </div>

      <div className="px-4 pb-8 space-y-5">
        {/* Service */}
        <div className="space-y-2">
          <Label>Escolha um serviço</Label>
          <div className="space-y-2">
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum serviço disponível.</p>
            )}
            {services.map((s: any) => (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors ${selectedServiceId === s.id ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => { setSelectedServiceId(s.id); setSelectedDate(""); setSelectedTime(""); }}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.durationMinutes}m
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Professional */}
        {professionals.length > 0 && (
          <div className="space-y-2">
            <Label>Escolha um profissional (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {professionals.map((p: any) => (
                <Button
                  key={p.id}
                  variant={selectedProfessionalId === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedProfessionalId(selectedProfessionalId === p.id ? "" : p.id); setSelectedDate(""); setSelectedTime(""); }}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="space-y-2">
          <Label>Escolha a data</Label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <Button
                key={d}
                variant={selectedDate === d ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0 flex-col h-auto py-2 px-3"
                onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
              >
                <span className="text-xs capitalize">{formatDateLabel(d).split(" ")[0]}</span>
                <span className="text-sm font-bold">{d.split("-")[2]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="space-y-2">
            <Label>Escolha o horário</Label>
            {loadingSlots ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-20" />
                ))}
              </div>
            ) : !slots || slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum horário disponível nesta data.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {slots.map((slot: any) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                  >
                    {slot.time.slice(0, 5)}
                  </Button>
                ))}
              </div>
            )}
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

        <Button
          onClick={handleBook}
          disabled={!clientName.trim() || !selectedTime || !selectedDate || createAppointment.isPending}
          className="w-full h-12 text-base"
        >
          <Calendar className="mr-2 w-5 h-5" />
          {createAppointment.isPending ? "Agendando..." : "Confirmar Agendamento"}
        </Button>
      </div>
    </div>
  );
}
