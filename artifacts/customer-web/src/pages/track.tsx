import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, List, Calendar, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  useGetQueueEntry,
  useGetAppointment,
} from "@workspace/api-client-react";
import { loadSession, clearSession, type CustomerSession } from "@/lib/session";

function statusLabel(status: string) {
  const map: Record<string, string> = {
    waiting: "Aguardando",
    called: "Chamado",
    in_service: "Em atendimento",
    done: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
    scheduled: "Agendado",
    confirmed: "Confirmado",
  };
  return map[status] || status;
}

function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["waiting", "scheduled", "confirmed"].includes(status)) return "default";
  if (["called", "in_service"].includes(status)) return "secondary";
  if (["done"].includes(status)) return "outline";
  return "destructive";
}

function QueueTracker({ session }: { session: Extract<CustomerSession, { type: "queue" }> }) {
  const { data: entry, isLoading, refetch } = useGetQueueEntry(
    session.queueId,
    session.id,
    { query: { refetchInterval: 5000, queryKey: ["/queues", session.queueId, "entries", session.id] } }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-8">
        <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Registro não encontrado na fila.</p>
      </div>
    );
  }

  const isFinished = ["done", "cancelled", "no_show"].includes(entry.status);
  const isCalled = ["called", "in_service"].includes(entry.status);

  return (
    <div className="space-y-4">
      <Card className={`${isCalled ? "border-green-500 ring-1 ring-green-500" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{session.businessName}</h3>
            <Badge variant={statusColor(entry.status)}>{statusLabel(entry.status)}</Badge>
          </div>

          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Sua senha</p>
            <p className="text-5xl font-bold tabular-nums">{entry.ticketNumber}</p>
          </div>

          {!isFinished && !isCalled && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {entry.waitingAhead != null && entry.waitingAhead > 0
                  ? `${entry.waitingAhead} pessoa(s) na sua frente`
                  : "Você é o próximo!"}
              </p>
              {entry.estimatedWaitMinutes != null && entry.estimatedWaitMinutes > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo estimado: ~{entry.estimatedWaitMinutes} min
                </p>
              )}
            </div>
          )}

          {isCalled && (
            <div className="bg-green-50 text-green-800 rounded-lg p-3 text-center text-sm font-medium">
              É a sua vez! Dirija-se ao atendimento.
            </div>
          )}
        </CardContent>
      </Card>

      {!isFinished && (
        <Button variant="outline" className="w-full" onClick={() => refetch()}>
          <Loader2 className="mr-2 w-4 h-4" />
          Atualizar
        </Button>
      )}
    </div>
  );
}

function AppointmentTracker({ session }: { session: Extract<CustomerSession, { type: "appointment" }> }) {
  const { data: appt, isLoading, refetch } = useGetAppointment(
    session.id,
    { query: { refetchInterval: 10000, queryKey: ["/appointments", session.id] } }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="text-center py-8">
        <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Agendamento não encontrado.</p>
      </div>
    );
  }

  const scheduled = new Date(appt.scheduledAt);
  const isPast = scheduled < new Date();

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{session.businessName}</h3>
          <Badge variant={statusColor(appt.status)}>{statusLabel(appt.status)}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{scheduled.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <span>{scheduled.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={() => refetch()}>
          <Loader2 className="mr-2 w-4 h-4" />
          Atualizar
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TrackPage() {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<CustomerSession | null>(loadSession);

  useEffect(() => {
    const check = () => setSession(loadSession());
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

  const handleClear = () => {
    clearSession();
    setSession(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <List className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-xl font-semibold mb-2">Nenhuma sessão ativa</h2>
        <p className="text-muted-foreground mb-4">Você não está em nenhuma fila ou agendamento.</p>
        <Button onClick={() => navigate("/")}>Buscar Estabelecimento</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="-ml-2 mb-2">
          <ArrowLeft className="mr-1 w-4 h-4" />
          Início
        </Button>
        <h1 className="text-xl font-bold">
          {session.type === "queue" ? "Acompanhar Fila" : "Meu Agendamento"}
        </h1>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {session.type === "queue" ? (
          <QueueTracker session={session} />
        ) : (
          <AppointmentTracker session={session} />
        )}

        <Button variant="ghost" className="w-full text-destructive" onClick={handleClear}>
          <XCircle className="mr-2 w-4 h-4" />
          Encerrar acompanhamento
        </Button>
      </div>
    </div>
  );
}
