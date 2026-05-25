import { useState } from "react";
import {
  useListBusinesses,
  useListAppointments,
  useListProfessionals,
  useListServices,
  useUpdateAppointmentStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Phone, User, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  scheduled: "bg-yellow-500",
  confirmed: "bg-blue-500",
  in_service: "bg-green-500",
  done: "bg-gray-500",
  cancelled: "bg-red-500",
  no_show: "bg-orange-500",
};

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_service: "In Service",
  done: "Done",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function AppointmentsPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const { data: businesses, isLoading: loadingBusinesses } = useListBusinesses();
  const { data: professionals } = useListProfessionals(
    selectedBusinessId || "",
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/businesses/professionals", selectedBusinessId] } }
  );
  const { data: services } = useListServices(
    selectedBusinessId || "",
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/businesses/services", selectedBusinessId] } }
  );

  const apptParams = selectedBusinessId
    ? {
        businessId: selectedBusinessId,
        date: today,
        professionalId: selectedProfessionalId ?? undefined,
        status: statusFilter ?? undefined,
      }
    : { businessId: "", date: today };
  const { data: appointments, isLoading } = useListAppointments(
    apptParams,
    { query: { enabled: !!selectedBusinessId, queryKey: ["/api/appointments", apptParams] } }
  );

  const updateStatus = useUpdateAppointmentStatus();

  function handleStatusChange(id: string, status: string) {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => toast({ title: "Status updated" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const sorted = appointments?.slice().sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Today's schedule and booking status.</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedBusinessId} onValueChange={(v) => { setSelectedBusinessId(v); setSelectedProfessionalId(""); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedProfessionalId ?? "all"}
            onValueChange={(v) => setSelectedProfessionalId(v === "all" ? null : v)}
            disabled={!selectedBusinessId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Any professional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Professionals</SelectItem>
              {professionals?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter ?? "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_service">In Service</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedBusinessId ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>Select a Business</CardTitle>
            <CardDescription>Choose a business to view today's appointments.</CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : sorted?.length === 0 ? (
        <Card className="p-12 text-center">
          <CardHeader>
            <CardTitle>No appointments today</CardTitle>
            <CardDescription>No bookings found for this date.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted?.map((appt) => {
            const time = new Date(appt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const serviceName = services?.find((s) => s.id === appt.serviceId)?.name;
            const profName = professionals?.find((p) => p.id === appt.professionalId)?.name;
            return (
              <Card key={appt.id} data-testid={`card-appointment-${appt.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-muted rounded-lg px-3 py-2 min-w-[60px]">
                        <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-sm font-bold">{time}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{appt.clientName}</span>
                          <Badge className={`${statusColor[appt.status] || "bg-gray-500"} text-white text-xs`}>
                            {statusLabel[appt.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {serviceName && (
                            <span className="flex items-center gap-1">
                              <Scissors className="h-3 w-3" />
                              {serviceName}
                            </span>
                          )}
                          {profName && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {profName}
                            </span>
                          )}
                          {appt.clientPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {appt.clientPhone}
                            </span>
                          )}
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{appt.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {appt.status === "scheduled" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(appt.id, "confirmed")} disabled={updateStatus.isPending}>
                          Confirm
                        </Button>
                      )}
                      {appt.status === "confirmed" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(appt.id, "in_service")} disabled={updateStatus.isPending}>
                          Start
                        </Button>
                      )}
                      {appt.status === "in_service" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(appt.id, "done")} disabled={updateStatus.isPending}>
                          Done
                        </Button>
                      )}
                      {(appt.status === "scheduled" || appt.status === "confirmed") && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(appt.id, "cancelled")} disabled={updateStatus.isPending}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
